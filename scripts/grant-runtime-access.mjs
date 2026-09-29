// Give only this project's function identity database access and image access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectId = 'soow-2dc12';
const bucketName = `${projectId}.firebasestorage.app`;
const member = 'serviceAccount:600450156090-compute@developer.gserviceaccount.com';
const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const accessToken = config.tokens?.access_token;
if (!accessToken || config.tokens?.expires_at < Date.now() + 5 * 60000) throw new Error('Refresh Firebase CLI login first.');
const call = async (url, method, body) => {
  const response = await fetch(url, {
    method, headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`IAM ${response.status}: ${(await response.text()).slice(0, 1000)}`);
  return response.json();
};
const addBinding = (policy, role) => {
  const binding = policy.bindings?.find(item => item.role === role && !item.condition);
  if (binding?.members?.includes(member)) return false;
  if (binding) binding.members.push(member);
  else (policy.bindings ||= []).push({ role, members: [member] });
  return true;
};
const projectUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
const projectPolicy = await call(`${projectUrl}:getIamPolicy`, 'POST', { options: { requestedPolicyVersion: 3 } });
const databaseGranted = addBinding(projectPolicy, 'roles/datastore.user');
if (databaseGranted) await call(`${projectUrl}:setIamPolicy`, 'POST', { policy: projectPolicy });

const bucketUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/iam`;
const bucketPolicy = await call(bucketUrl, 'GET');
const mediaGranted = addBinding(bucketPolicy, 'roles/storage.objectAdmin');
if (mediaGranted) await call(bucketUrl, 'PUT', bucketPolicy);
console.log(JSON.stringify({ projectId, databaseGranted, mediaGranted }));
