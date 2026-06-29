export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'name e phone são obrigatórios' });

  const lead = {
    name: name.trim(),
    phone: phone.trim(),
    timestamp: new Date().toISOString(),
    source: req.headers.referer || 'direct',
  };

  const filename = `data/leads/${Date.now()}.json`;
  const content = Buffer.from(JSON.stringify(lead, null, 2)).toString('base64');

  const ghRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'green-boat-leads',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `lead: ${lead.name}`,
        content,
      }),
    }
  );

  if (!ghRes.ok) {
    const err = await ghRes.json().catch(() => ({}));
    console.error('GitHub API error:', err);
    return res.status(500).json({ error: 'Falha ao salvar lead' });
  }

  return res.status(200).json({ success: true });
}
