import React, { Suspense, lazy } from "react";
import "./index.css";

const FoulPlayGUI = lazy(() => import("./tabs/FoulPlayGUI.jsx"));

class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error("FoulPlay UI crashed:", error, info); }
  render(){
    if(this.state.hasError){
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100 p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">FoulPlay UI error</h1>
            <p className="mb-4 text-red-300">{String(this.state.error)}</p>
            <p className="text-sm text-gray-400">Check the browser console and Logs & Stats → Frontend log.</p>
          </div>
        </div>
      );
    }
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-900 text-gray-100 p-8">Loading UI…</div>}>
        <FoulPlayGUI />
      </Suspense>
    );
  }
}

export default function App(){ return <ErrorBoundary />; }
