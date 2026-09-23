const weekdayList=document.getElementById('weekdayList');
const imageFilesInput=document.getElementById('imageFiles');
const selectedFilesContainer=document.getElementById('selectedFiles');
const previewEl=document.getElementById('jsonPreview');
let selectedFiles=[];

function sanitizeFileName(name){return name.trim().replace(/\s+/g,'-').replace(/[^a-zA-Z0-9._-]/g,'');}
function addWeekdayRow(){
  const row=document.createElement('div'); row.className='weekday-row';
  row.innerHTML=`<label>Day<input type="text" name="day" placeholder="Monday"></label><label>Time start<input type="time" name="time_start"></label><label>Time end<input type="time" name="time_end"></label><label>Fee<input type="text" name="fee" placeholder="e.g. 10"></label><button type="button" class="remove-btn">Remove</button>`;
  row.querySelector('.remove-btn').addEventListener('click',()=>{row.remove(); updatePreview();});
  weekdayList.appendChild(row); updatePreview();
}
function updateSelectedFilesList(){
  selectedFilesContainer.innerHTML='';
  if(!selectedFiles.length){selectedFilesContainer.textContent='No image attachments selected yet.';return;}
  selectedFiles.forEach(file=>{const pill=document.createElement('span');pill.className='file-pill';pill.textContent=file.name;selectedFilesContainer.appendChild(pill);});
}
function buildPayload(){
  const formData=new FormData(document.getElementById('eventForm'));
  const weekdays=Array.from(document.querySelectorAll('.weekday-row')).map(row=>{
    const values={}; row.querySelectorAll('input').forEach(input=>values[input.name]=input.value);
    return {day:values.day||'',time_start:values.time_start||'',time_end:values.time_end||'',fee:values.fee||''};
  }).filter(entry=>Object.values(entry).some(value=>value!==''));
  return {reference:formData.get('reference')||'',title:formData.get('title')||'',description:formData.get('description')||'',image:selectedFiles.map(file=>`imageattachments/${sanitizeFileName(file.name)}`),url:formData.get('url')||'',date:formData.get('date')||'',date_end:formData.get('date_end')||'',time_start:formData.get('time_start')||'',time_end:formData.get('time_end')||'',weekdays,category:formData.get('category')||'',location_id:formData.get('location_id')||''};
}
function updatePreview(){previewEl.textContent=JSON.stringify(buildPayload(),null,2);}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
imageFilesInput.addEventListener('change',event=>{selectedFiles=Array.from(event.target.files||[]);updateSelectedFilesList();updatePreview();});
document.getElementById('addWeekdayBtn').addEventListener('click',addWeekdayRow);
document.getElementById('previewBtn').addEventListener('click',updatePreview);
document.getElementById('downloadJsonBtn').addEventListener('click',()=>downloadBlob(new Blob([JSON.stringify(buildPayload(),null,2)],{type:'application/json'}),'event.json'));
document.getElementById('downloadPackageBtn').addEventListener('click',async()=>{const zip=new JSZip();zip.file('event.json',JSON.stringify(buildPayload(),null,2));const folder=zip.folder('imageattachments');selectedFiles.forEach(file=>folder.file(sanitizeFileName(file.name),file));downloadBlob(await zip.generateAsync({type:'blob'}),'calendar_export.zip');});
addWeekdayRow(); updateSelectedFilesList(); updatePreview();
