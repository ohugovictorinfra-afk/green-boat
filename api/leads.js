module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const listRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/data/leads`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'green-boat-leads',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (listRes.status === 404) return res.status(200).json([]);
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    console.error('GitHub list error:', listRes.status, err);
    return res.status(500).json({ error: 'Falha ao buscar leads' });
  }

  const files = await listRes.json();
  const jsonFiles = files.filter(function(f) { return f.name.endsWith('.json'); });

  const leads = await Promise.all(
    jsonFiles.map(function(f) {
      return fetch(f.download_url).then(function(r) { return r.json(); }).catch(function() { return null; });
    })
  );

  const sorted = leads
    .filter(Boolean)
    .sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(sorted);
};
