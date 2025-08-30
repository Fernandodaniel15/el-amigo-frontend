import { render, screen } from "@testing-library/react";
import FeedItem from "../../components/FeedItem";

test("muestra contenido del post", () => {
  render(<FeedItem userId="test" content="hola" type="text" />);
  expect(screen.getByText("hola")).toBeInTheDocument();
});
