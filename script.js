const weekdayList = document.getElementById('weekdayList');
const imageFilesInput = document.getElementById('imageFiles');
const selectedFilesContainer = document.getElementById('selectedFiles');
const previewEl = document.getElementById('jsonPreview');
const ftpStatusEl = document.getElementById('ftpStatus');
const eventForm = document.getElementById('eventForm');
const referenceInput = eventForm.elements.reference;
const urlInput = eventForm.elements.url;
const URL_VALUE = 'www.gasthofzumwidder.ch';
let selectedFiles = [];

function sanitizeFileName(name) { return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, ''); }
function sanitizeDirectoryName(name) { return (name.trim() || 'calendar_export').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/\s+/g, '-').replace(/[. ]+$/g, '') || 'calendar_export'; }
function normalizeEuropeanTime(input) { const value = input.trim().replace('.', ':'); if (!value) return ''; const match = /^(\d{1,2}):(\d{2})$/.exec(value); return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value; }
function addWeekdayRow() {
  const row = document.createElement('div'); row.className = 'weekday-row';
  row.innerHTML = `<label>Day<input type="text" name="day" placeholder="Monday"></label><label>Time start<input class="european-time" type="text" name="time_start" inputmode="numeric" placeholder="HH:MM" maxlength="5"></label><label>Time end<input class="european-time" type="text" name="time_end" inputmode="numeric" placeholder="HH:MM" maxlength="5"></label><label>Fee<input type="text" name="fee" placeholder="e.g. 10"></label><button type="button" class="remove-btn">Remove</button>`;
  row.querySelector('.remove-btn').addEventListener('click', () => { row.remove(); updatePreview(); });
  weekdayList.appendChild(row); updatePreview();
}
function updateSelectedFilesList() { selectedFilesContainer.innerHTML = ''; if (!selectedFiles.length) { selectedFilesContainer.textContent = 'No image attachments selected yet.'; return; } selectedFiles.forEach(file => { const pill = document.createElement('span'); pill.className = 'file-pill'; pill.textContent = file.name; selectedFilesContainer.appendChild(pill); }); }
function buildPayload() {
  const formData = new FormData(eventForm);
  const categories = Array.from(document.getElementById('category').selectedOptions).map(option => Number(option.value));
  const weekdays = Array.from(document.querySelectorAll('.weekday-row')).map(row => { const values = {}; row.querySelectorAll('input').forEach(input => { values[input.name] = input.value; }); return { day: values.day || '', time_start: normalizeEuropeanTime(values.time_start || ''), time_end: normalizeEuropeanTime(values.time_end || ''), fee: values.fee || '' }; }).filter(entry => Object.values(entry).some(value => value !== ''));
  return { reference: referenceInput.value, title: formData.get('title') || '', description: formData.get('description') || '', image: selectedFiles.map(file => sanitizeFileName(file.name)), url: URL_VALUE, date: formData.get('date') || '', date_end: formData.get('date_end') || '', time_start: normalizeEuropeanTime(formData.get('time_start') || ''), time_end: normalizeEuropeanTime(formData.get('time_end') || ''), weekdays, category: categories, location_id: formData.get('location_id') || '' };
}
function updatePreview() { previewEl.textContent = JSON.stringify(buildPayload(), null, 2); }
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function jsonFileName(locationId) { return `${sanitizeDirectoryName(locationId)}.json`; }
function filesAsBase64() { return Promise.all(selectedFiles.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: sanitizeFileName(file.name), base64: String(reader.result).split(',')[1] }); reader.onerror = reject; reader.readAsDataURL(file); }))); }
async function getNextReference() { const response = await fetch('/api/reference', { method: 'POST' }); const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'Could not generate a reference.'); referenceInput.value = result.reference; updatePreview(); }
async function uploadToFtp() { const payload = buildPayload(); if (!payload.location_id.trim()) { ftpStatusEl.textContent = 'Enter a location name before uploading.'; return; } ftpStatusEl.textContent = 'Uploading to FTP server...'; try { const response = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ directoryName: sanitizeDirectoryName(payload.title), jsonFileName: jsonFileName(payload.location_id), event: payload, files: await filesAsBase64() }) }); const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'FTP upload failed.'); ftpStatusEl.textContent = `Uploaded successfully to ${result.remoteDirectory}`; } catch (error) { ftpStatusEl.textContent = `Upload failed: ${error.message}`; } }
async function hardReset() { if (!window.confirm('Are you sure you want to reset the form? All entered data and selected images will be cleared. A new reference will be assigned.')) return; eventForm.reset(); urlInput.value = URL_VALUE; selectedFiles = []; weekdayList.innerHTML = ''; addWeekdayRow(); updateSelectedFilesList(); ftpStatusEl.textContent = ''; try { await getNextReference(); } catch (error) { ftpStatusEl.textContent = `Reference error: ${error.message}`; } updatePreview(); }
imageFilesInput.addEventListener('change', event => { selectedFiles = Array.from(event.target.files || []); updateSelectedFilesList(); updatePreview(); });
document.getElementById('addWeekdayBtn').addEventListener('click', addWeekdayRow); document.getElementById('previewBtn').addEventListener('click', updatePreview); eventForm.addEventListener('input', updatePreview); eventForm.addEventListener('change', updatePreview); document.getElementById('downloadJsonBtn').addEventListener('click', () => { const payload = buildPayload(); if (!payload.location_id.trim()) { alert('Enter a location name before saving JSON.'); return; } downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), jsonFileName(payload.location_id)); }); document.getElementById('downloadPackageBtn').addEventListener('click', async () => { const payload = buildPayload(); if (!payload.location_id.trim()) { alert('Enter a location name before downloading the package.'); return; } const directoryName = sanitizeDirectoryName(payload.title); const zip = new JSZip(); const folder = zip.folder(directoryName); folder.file(jsonFileName(payload.location_id), JSON.stringify(payload, null, 2)); selectedFiles.forEach(file => folder.file(sanitizeFileName(file.name), file)); downloadBlob(await zip.generateAsync({ type: 'blob' }), `${directoryName}.zip`); }); document.getElementById('ftpUploadBtn').addEventListener('click', uploadToFtp); document.getElementById('resetBtn').addEventListener('click', hardReset);
addWeekdayRow(); updateSelectedFilesList(); updatePreview(); getNextReference().catch(error => { referenceInput.value = 'Reference unavailable'; ftpStatusEl.textContent = `Reference error: ${error.message}`; });
