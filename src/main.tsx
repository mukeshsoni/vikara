import React from "react";
import ReactDOM from "react-dom/client";
import { Button, MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.layer.css";
import "@mantine/notifications/styles.css";
import App from "./App";
import "./styles.css";
import "./layout.css";
import buttonClasses from "./button.module.css";

const theme = createTheme({
  components: {
    Button: Button.extend({
      classNames: buttonClasses,
    }),
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <Notifications />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
