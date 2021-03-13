import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Aspyere text", () => {
  render(<App />);
  const linkElement = screen.getByText(/Aspyere/i);
  expect(linkElement).toBeInTheDocument();
});
