import React from "react";

const WalletCard = ({ saldo = 0, moneda = "AMG" }) => (
  <div className="wallet-card">
    <div>
      <span>Saldo: </span>
      <strong>{`${saldo} ${moneda}`}</strong>
    </div>
    <div className="wallet-actions" />
  </div>
);

export default WalletCard;
