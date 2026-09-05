import { Component } from "react";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-[#171918] px-4 text-slate-100">
        <section className="w-full max-w-lg rounded-lg border border-slate-800 bg-[#242725] p-6 text-center">
          <h1 className="text-2xl font-semibold">This page could not be displayed</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Reload the page to try again. Your account and transaction data have not been changed.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-[#345CFF] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <a
              href="/"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Return home
            </a>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
