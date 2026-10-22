const $ = id => document.getElementById(id);
let entities = [], current, editing = null, busy = false, ready = false;
const controls = new Map();
function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
async function api(path, options) {
  const response = await fetch(`/api/${path}`, options);
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}
function setBusy(value) {
  busy = value;
  $('save').disabled = value || !ready;
  $('entity').disabled = value;
  $('refresh').disabled = value;
  $('cancel').disabled = value;
  for (const button of $('records').querySelectorAll('button')) button.disabled = value || !ready;
}
function reset() {
  editing = null;
  $('record-form').reset();
  controls.get('id').disabled = false;
  $('form-title').textContent = 'Create record';
}
function edit(row) {
  editing = row.id;
  for (const [key, input] of controls) input.value = row[key] ?? '';
  controls.get('id').disabled = true;
  $('form-title').textContent = `Edit record ${row.id}`;
  $('form-title').scrollIntoView({ behavior: 'smooth' });
}
function cell(row, text, tag = 'td') {
  const element = document.createElement(tag);
  element.textContent = String(text);
  row.append(element);
  return element;
}
async function load() {
  ready = false;
  setBusy(true);
  try {
    current = entities.find(e => e.name === $('entity').value);
    const references = {};
    for (const field of Object.values(current.fields)) {
      if (field.ref && !references[field.ref]) references[field.ref] = await api(field.ref);
    }
    const rows = await api(current.name);
    controls.clear();
    $('fields').replaceChildren();
    for (const [key, field] of Object.entries(current.fields)) {
      const label = document.createElement('label');
      label.htmlFor = `field-${key}`;
      label.textContent = field.label + (field.required ? ' *' : '');
      const input = document.createElement(field.ref || field.enum ? 'select' : 'input');
      input.id = `field-${key}`;
      input.name = key;
      input.required = field.required;
      if (field.ref || field.enum) {
        input.add(new Option('Select...', ''));
        if (field.ref) {
          const parent = entities.find(e => e.name === field.ref);
          for (const record of references[field.ref]) input.add(new Option(`${record.id}: ${record[parent.display]}`, String(record.id)));
        } else {
          for (const value of field.enum) input.add(new Option(value, value));
        }
      } else {
        input.type = field.type === 'date' ? 'date' : ['integer', 'money'].includes(field.type) ? 'number' : 'text';
        if (field.max !== undefined && field.type === 'text') input.maxLength = field.max;
        if (input.type === 'number') {
          input.step = field.type === 'integer' ? '1' : '0.01';
          if (field.min !== undefined) input.min = String(field.exclusiveMin ? field.min + Number(input.step) : field.min);
          if (field.max !== undefined) input.max = String(field.max);
        }
      }
      controls.set(key, input);
      $('fields').append(label, input);
    }
    const table = $('records');
    table.replaceChildren();
    const heading = document.createElement('tr');
    for (const field of Object.values(current.fields)) cell(heading, field.label, 'th').scope = 'col';
    cell(heading, 'Actions', 'th').scope = 'col';
    const head = document.createElement('thead');
    head.append(heading);
    table.append(head);
    const body = document.createElement('tbody');
    for (const record of rows) {
      const row = document.createElement('tr');
      for (const key of Object.keys(current.fields)) cell(row, record[key] ?? '(none)');
      const actions = cell(row, '');
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.onclick = () => edit(record);
      const remove = document.createElement('button');
      remove.textContent = 'Delete';
      remove.onclick = async () => {
        if (busy || !confirm(`Delete ${current.label} record ${record.id}? This cannot be undone.`)) return;
        setBusy(true);
        try {
          await api(`${current.name}/${record.id}`, { method: 'DELETE' });
          await load();
          if (ready) message(`Deleted record ${record.id}.`);
        } catch (error) { message(error.message, true); }
        finally { setBusy(false); }
      };
      actions.append(editButton, remove);
      body.append(row);
    }
    table.append(body);
    reset();
    ready = true;
    message(`${rows.length} ${current.label.toLowerCase()} loaded from MongoDB.`);
  } catch (error) { message(error.message, true); }
  finally { setBusy(false); }
}
$('record-form').onsubmit = async event => {
  event.preventDefault();
  if (busy || !ready) return;
  const data = {};
  for (const [key, input] of controls) {
    const field = current.fields[key];
    data[key] = input.value === '' && !field.required ? null :
      ['integer', 'money'].includes(field.type) ? Number(input.value) : input.value;
  }
  setBusy(true);
  try {
    await api(current.name + (editing === null ? '' : `/${editing}`), {
      method: editing === null ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    await load();
    if (ready) message('Saved to MongoDB.');
  } catch (error) { message(error.message, true); }
  finally { setBusy(false); }
};
$('cancel').onclick = () => { if (ready) reset(); };
$('entity').onchange = load;
$('refresh').onclick = load;
try {
  const health = await api('health');
  const definition = await api('scenario');
  entities = definition.entities;
  $('title').textContent = definition.title;
  document.title = definition.title;
  for (const entity of entities) $('entity').add(new Option(entity.label, entity.name));
  await load();
  if (ready) message(`Connected to ${health.database}. ${$('message').textContent}`);
} catch (error) {
  message(`${error.message} Start MongoDB and the server, then reload this page.`, true);
}
