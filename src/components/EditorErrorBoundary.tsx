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
  /** One silent remount is enough for transient DOM races. */
  private retried = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NoteSeen: editor crashed", error, info);

    if (!this.retried) {
      this.retried = true;
      this.retryTimer = setTimeout(() => this.setState({ error: null }), 60);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private reload = () => {
    this.retried = false;
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-sm border border-dashed border-hairline px-6 py-10 text-center">
        <p className="ns-feature text-ink">{this.props.fallbackTitle ?? "Editor hit a snag"}</p>
        <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
          Your note is safe — it was saved before this. Reload the editor to keep writing.
        </p>
        <Button variant="primary" size="sm" className="mt-5" onClick={this.reload}>
          Reload editor
        </Button>
      </div>
    );
  }
}
