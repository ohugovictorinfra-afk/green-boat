module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const name  = typeof body === 'string' ? JSON.parse(body).name  : body.name;
  const phone = typeof body === 'string' ? JSON.parse(body).phone : body.phone;

  if (!name || !phone) {
    return res.status(400).json({ error: 'name e phone obrigatorios', received: JSON.stringify(body) });
  }

  const lead = {
    name: String(name).trim(),
    phone: String(phone).trim(),
    timestamp: new Date().toISOString(),
    source: req.headers.referer || 'direct',
  };

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;

  // Debug: verificar se as vars chegaram (sem expor o token)
  console.log('GITHUB_REPO:', repo);
  console.log('GITHUB_TOKEN length:', token ? token.length : 0);
  console.log('GITHUB_TOKEN starts with:', token ? token.substring(0, 10) : 'MISSING');

  const filename = `data/leads/${Date.now()}.json`;
  const content  = Buffer.from(JSON.stringify(lead, null, 2)).toString('base64');

  const ghRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'green-boat-leads',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ message: `lead: ${lead.name}`, content }),
    }
  );

  const ghBody = await ghRes.json().catch(() => ({}));

  if (!ghRes.ok) {
    console.error('GitHub error:', ghRes.status, JSON.stringify(ghBody));
    return res.status(500).json({ error: 'Falha ao salvar lead', gh_status: ghRes.status, gh_message: ghBody.message });
  }

  return res.status(200).json({ success: true });
};
