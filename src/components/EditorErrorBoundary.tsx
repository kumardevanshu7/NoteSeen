import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

/** Keeps a paste/editor crash from blanking the whole app shell. */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NoteSeen: editor crashed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-sm border border-dashed border-hairline px-6 py-10 text-center">
        <p className="ns-feature text-ink">{this.props.fallbackTitle ?? "Editor hit a snag"}</p>
        <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
          That paste was too messy for the editor. Try again with less formatting, or paste as plain
          text (Ctrl+Shift+V).
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-5"
          onClick={() => this.setState({ error: null })}
        >
          Reload editor
        </Button>
      </div>
    );
  }
}
