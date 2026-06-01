import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Aura Work]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            color: "#3d3832",
            background: "#faf9f5",
            minHeight: "100vh",
          }}
        >
          <h1>Aura Work UI error</h1>
          <p>{this.state.error}</p>
          <p>Try restarting: npm run dev</p>
        </div>
      );
    }
    return this.props.children;
  }
}
