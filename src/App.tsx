import { memo } from "react";
import AppWithAuth from "./AppWithAuth";

const App = memo(() => {
  return <AppWithAuth />;
});

App.displayName = "App";

export default App;
