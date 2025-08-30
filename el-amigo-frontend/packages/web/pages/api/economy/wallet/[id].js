// packages/web/pages/api/economy/wallet/[id].js
export default function handler(req, res) {
  const { id } = req.query;           // ← id que llega en la URL

  // 👉 mock de ejemplo — después lo sustituiremos por BD real
  const wallet = {
    id,
    owner:       'Ana',
    currency:    'ARS',
    balance:     1234.56,
    transactions: [
      { id: 1, amount:  -20, description: 'Café' },
      { id: 2, amount: +300, description: 'Ingreso sueldo' },
      { id: 3, amount:  -50, description: 'Supermercado' }
    ]
  };

  res.status(200).json(wallet);
}
