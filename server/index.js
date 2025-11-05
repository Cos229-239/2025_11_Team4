const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const orders = [
  { id: '101', items: ['BLT', 'Fries'], status: 'NEW',         ts: '10:05' },
  { id: '102', items: ['Cobb Salad'],  status: 'IN-PROGRESS', ts: '10:07' }
];

app.get('/orders', (_, res) => res.json(orders));
app.get('/orders/:id', (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  res.json(o || {});
});

app.listen(process.env.PORT || 3000, () => console.log('api up on 3000'));
