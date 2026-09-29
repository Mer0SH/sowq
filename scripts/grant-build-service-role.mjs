// Grant the standard Cloud Build role to this project's default build identity.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectId = 'soow-2dc12';
const projectNumber = '600450156090';
const member = `serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com`;
const role = 'roles/cloudbuild.builds.builder';
const cliConfig = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const accessToken = cliConfig.tokens?.access_token;
if (!accessToken || cliConfig.tokens?.expires_at < Date.now() + 5 * 60000) throw new Error('Refresh Firebase CLI login first.');
const call = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`IAM ${response.status}: ${(await response.text()).slice(0, 1000)}`);
  return response.json();
};
const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
const policy = await call(`${url}:getIamPolicy`, { options: { requestedPolicyVersion: 3 } });
const binding = policy.bindings?.find(item => item.role === role && !item.condition);
if (binding?.members?.includes(member)) {
  console.log(JSON.stringify({ projectId, alreadyGranted: true }));
  process.exit(0);
}
if (binding) binding.members.push(member);
else (policy.bindings ||= []).push({ role, members: [member] });
await call(`${url}:setIamPolicy`, { policy });
console.log(JSON.stringify({ projectId, granted: true, role, member }));
