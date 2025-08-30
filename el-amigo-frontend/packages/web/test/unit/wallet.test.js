import { render, screen } from "@testing-library/react";
import WalletCard from "../../components/WalletCard";

test("renderiza wallet correctamente", () => {
  render(<WalletCard saldo={150} moneda="AMG" />);
  expect(screen.getByText(/150\s*AMG/i)).toBeInTheDocument();
});
