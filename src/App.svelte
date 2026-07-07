<script>
  import { parseCSVFile, applyMapping, generateDefaultMapping, sanitizeKey } from './lib/csvParser.js';

  let dragOver = $state(false);
  let fileName = $state('');
  let csvHeaders = $state([]);
  let csvRows = $state([]);
  let csvRawRows = $state([]);
  let mapping = $state({});
  let jsonOutput = $state([]);
  let errorMessage = $state('');
  let jsonPreviewCollapsed = $state(false);
  let showAutoMapHint = $state(false);
  let fileInput = $state(null);

  let jsonText = $derived(JSON.stringify(jsonOutput, null, 2));

  let duplicateKeys = $derived.by(() => {
    const keys = Object.values(mapping).filter(k => k.trim() !== '');
    const seen = new Set();
    const dupes = new Set();
    for (const k of keys) {
      if (seen.has(k)) dupes.add(k);
      seen.add(k);
    }
    return dupes;
  });

  let activeMappingCount = $derived(Object.values(mapping).filter(k => k.trim() !== '').length);
  let excludedCount = $derived(csvHeaders.length - activeMappingCount);
  let jsonBlobSize = $derived((() => {
    if (jsonOutput.length === 0) return '';
    const blob = new Blob([jsonText]);
    return blob.size < 1024 ? blob.size + ' B' : (blob.size / 1024).toFixed(1) + ' KB';
  })());

  function handleDragOver(e) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleFileSelect(e) {
    const files = e.target?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (e.target) e.target.value = '';
  }

  async function processFile(file) {
    errorMessage = '';
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.tsv') && !file.name.toLowerCase().endsWith('.txt')) {
      errorMessage = 'Il file non sembra essere un CSV. Prova con un file .csv, .tsv o .txt.';
      return;
    }

    try {
      const data = await parseCSVFile(file);
      fileName = file.name;
      csvHeaders = data.headers;
      csvRows = data.rows;
      csvRawRows = data.rawRows;

      if (csvHeaders.length === 0) {
        errorMessage = 'Il file CSV non contiene intestazioni di colonna. Assicurati che la prima riga contenga i nomi delle colonne.';
        return;
      }

      mapping = generateDefaultMapping(csvHeaders);
      updateJsonOutput();
    } catch (err) {
      errorMessage = err.message || 'Impossibile leggere il file. Verifica che sia un CSV valido.';
    }
  }

  function updateJsonOutput() {
    jsonOutput = applyMapping(csvRows, mapping);
  }

  function handleMappingChange(csvCol, newKey) {
    mapping = { ...mapping, [csvCol]: newKey };
    updateJsonOutput();
  }

  function handleAutoMap() {
    mapping = generateDefaultMapping(csvHeaders);
    updateJsonOutput();
    showAutoMapHint = true;
    setTimeout(() => { showAutoMapHint = false; }, 2000);
  }

  function handleResetMapping() {
    const empty = {};
    for (const h of csvHeaders) {
      empty[h] = '';
    }
    mapping = empty;
    updateJsonOutput();
  }

  function handleDownload() {
    if (jsonOutput.length === 0) return;
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = fileName.replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = `${baseName || 'dati'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopyJson() {
    if (jsonOutput.length === 0) return;
    navigator.clipboard.writeText(jsonText).catch(() => {});
  }

  function handleRemoveFile() {
    fileName = '';
    csvHeaders = [];
    csvRows = [];
    csvRawRows = [];
    mapping = {};
    jsonOutput = [];
    errorMessage = '';
    jsonPreviewCollapsed = false;
  }

  function clearError() {
    errorMessage = '';
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  function handleDropZoneKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileInput();
    }
  }
</script>

<svelte:window ondragover={handleDragOver} />

<div class="app-shell">

  <!-- ===== HEADER ===== -->
  <header class="app-header">
    <div class="header-inner">
      <div class="header-brand">
        <!-- Signature SVG: data-flow diagram -->
        <svg class="signature-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="2" y="6" width="12" height="6" rx="1.5" fill="var(--primary)" opacity="0.15" />
          <rect x="2" y="6" width="12" height="6" rx="1.5" stroke="var(--primary)" stroke-width="1.5" />
          <text x="8" y="10.5" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="500" fill="var(--primary)">CSV</text>

          <line x1="15" y1="9" x2="25" y2="9" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="2 1.5" />

          <rect x="26" y="6" width="12" height="6" rx="1.5" fill="var(--accent)" opacity="0.12" />
          <rect x="26" y="6" width="12" height="6" rx="1.5" stroke="var(--accent)" stroke-width="1.5" />
          <text x="29.2" y="10.5" font-family="'JetBrains Mono', monospace" font-size="4" font-weight="500" fill="var(--accent)">{'{ }'}</text>

          <line x1="32" y1="13" x2="32" y2="23" stroke="var(--primary)" stroke-width="1.2" stroke-dasharray="2 1.5" />

          <rect x="26" y="24" width="12" height="6" rx="1.5" fill="var(--primary)" opacity="0.12" />
          <rect x="26" y="24" width="12" height="6" rx="1.5" stroke="var(--primary)" stroke-width="1.5" />
          <text x="29.2" y="28.5" font-family="'JetBrains Mono', monospace" font-size="4" font-weight="500" fill="var(--primary)">{'{ }'}</text>

          <!-- Small dots for decoration -->
          <circle cx="20" cy="32" r="1.2" fill="var(--amber)" opacity="0.6" />
          <circle cx="25" cy="35" r="0.8" fill="var(--accent)" opacity="0.4" />
          <circle cx="15" cy="35" r="0.8" fill="var(--primary)" opacity="0.4" />
        </svg>

        <div>
          <h1 class="app-title">Convertitore <span class="title-accent">CSV → JSON</span></h1>
          <p class="app-subtitle">Mappa, trasforma, esporta. I tuoi dati restano nel browser.</p>
        </div>
      </div>

      <div class="header-actions">
        <span class="badge badge--local" title="Nessun dato inviato a server esterni">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Locale
        </span>
      </div>
    </div>
  </header>

  <!-- ===== MAIN CONTENT ===== -->
  <main class="app-main">

    <!-- Error banner -->
    {#if errorMessage}
      <div class="error-banner" role="alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span>{errorMessage}</span>
        <button class="error-dismiss" onclick={clearError} aria-label="Chiudi avviso">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    {/if}

    <!-- Drop zone -->
    <div
      class="drop-zone"
      class:drop-zone--active={dragOver}
      class:drop-zone--compact={!!fileName}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onkeydown={handleDropZoneKeydown}
      tabindex="0"
      role="button"
      aria-label="Trascina qui un file CSV o clicca per selezionarlo"
    >
      <input
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
        bind:this={fileInput}
        onchange={handleFileSelect}
        class="sr-only"
        id="file-input"
      />

      {#if fileName}
        <div class="drop-zone-file">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="drop-zone-filename">{fileName}</span>
          <span class="drop-zone-meta">{csvRows.length} righe &middot; {csvHeaders.length} colonne</span>
          <button class="btn btn--ghost btn--sm" onclick={handleRemoveFile} aria-label="Rimuovi file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Rimuovi
          </button>
          <button class="btn btn--ghost btn--sm" onclick={triggerFileInput} aria-label="Cambia file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Cambia
          </button>
        </div>
      {:else}
        <div class="drop-zone-empty">
          <div class="drop-zone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p class="drop-zone-text"><strong>Trascina qui il tuo file CSV</strong> &mdash; oppure <button class="link-btn" onclick={triggerFileInput}>sfoglia i file</button></p>
          <p class="drop-zone-hint">Supporta .csv, .tsv, .txt con intestazioni di colonna nella prima riga</p>
        </div>
      {/if}
    </div>

    <!-- Main tool area -->
    {#if fileName && csvHeaders.length > 0}
      <div class="tool-area">

        <!-- Mapping Editor -->
        <section class="panel panel--mapping" aria-labelledby="mapping-heading">
          <div class="panel-header">
            <h2 id="mapping-heading" class="panel-title">Editor di mapping</h2>
            <div class="panel-header-actions">
              {#if showAutoMapHint}
                <span class="hint-fade" aria-live="polite">Mapping rigenerato</span>
              {/if}
              <button class="btn btn--ghost btn--sm" onclick={handleAutoMap} title="Rigenera il mapping automatico dai nomi delle colonne">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Auto-mappa
              </button>
              <button class="btn btn--ghost btn--sm btn--danger" onclick={handleResetMapping} title="Svuota tutte le chiavi JSON">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Resetta
              </button>
            </div>
          </div>

          <div class="panel-body mapping-body">
            <div class="mapping-header-row">
              <span class="mapping-col-label">Colonna CSV</span>
              <span class="mapping-arrow" aria-hidden="true"></span>
              <span class="mapping-col-label">Chiave JSON</span>
              <span class="mapping-col-label mapping-preview-label">Anteprima valore</span>
            </div>

            <ul class="mapping-list" role="list">
              {#each csvHeaders as csvCol, i (csvCol)}
                <li class="mapping-row" class:mapping-row--active={mapping[csvCol]?.trim() !== ''} class:mapping-row--duplicate={duplicateKeys.has(mapping[csvCol]?.trim())}>
                  <div class="mapping-source">
                    <span class="mapping-index" aria-label="Colonna {i + 1}">{i + 1}</span>
                    <code class="mapping-csv-col">{csvCol}</code>
                  </div>

                  <div class="mapping-connector" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="connector-svg">
                      <path d="M4 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <polyline points="13 8 17 12 13 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>

                  <div class="mapping-target">
                    <label for="json-key-{i}" class="sr-only">Chiave JSON per la colonna "{csvCol}"</label>
                    <input
                      id="json-key-{i}"
                      type="text"
                      class="mapping-input"
                      class:mapping-input--duplicate={duplicateKeys.has(mapping[csvCol]?.trim())}
                      value={mapping[csvCol] || ''}
                      oninput={(e) => handleMappingChange(csvCol, e.target.value)}
                      placeholder="lascia vuoto per escludere"
                      autocomplete="off"
                      spellcheck="false"
                    />
                    {#if duplicateKeys.has(mapping[csvCol]?.trim())}
                      <span class="field-hint field-hint--error" role="alert">Chiave duplicata</span>
                    {/if}
                    {#if mapping[csvCol]?.trim() === ''}
                      <span class="field-hint field-hint--muted">Esclusa dall'output</span>
                    {/if}
                  </div>

                  <div class="mapping-preview">
                    <code class="mapping-preview-value">{csvRawRows[0]?.[i] ?? '—'}</code>
                  </div>
                </li>
              {/each}
            </ul>

            <div class="mapping-summary">
              <span>{activeMappingCount} di {csvHeaders.length} colonne mappate</span>
              {#if excludedCount > 0}
                <span class="text-muted">&middot; {excludedCount} escluse</span>
              {/if}
              {#if duplicateKeys.size > 0}
                <span class="text-warning" role="alert">&middot; {duplicateKeys.size} chiave duplicata — rinomina per evitare perdita di dati</span>
              {/if}
            </div>
          </div>
        </section>

        <!-- JSON Preview -->
        <section class="panel panel--preview" aria-labelledby="preview-heading">
          <div class="panel-header">
            <h2 id="preview-heading" class="panel-title">Anteprima JSON</h2>
            <div class="panel-header-actions">
              <span class="badge badge--count">{jsonOutput.length} record</span>
              <button
                class="btn btn--ghost btn--sm"
                onclick={() => jsonPreviewCollapsed = !jsonPreviewCollapsed}
                aria-label={jsonPreviewCollapsed ? 'Espandi anteprima' : 'Comprimi anteprima'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  {#if jsonPreviewCollapsed}
                    <polyline points="6 9 12 15 18 9"/>
                  {:else}
                    <polyline points="18 15 12 9 6 15"/>
                  {/if}
                </svg>
                {jsonPreviewCollapsed ? 'Espandi' : 'Comprimi'}
              </button>
              <button class="btn btn--ghost btn--sm" onclick={handleCopyJson} title="Copia JSON negli appunti" disabled={jsonOutput.length === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copia
              </button>
            </div>
          </div>

          {#if !jsonPreviewCollapsed}
            <div class="panel-body preview-body">
              {#if jsonOutput.length > 0}
                <pre class="json-preview"><code>{jsonText}</code></pre>
              {:else}
                <div class="preview-empty">
                  <p>Nessun dato da mostrare. Mappa almeno una colonna per vedere l'anteprima.</p>
                </div>
              {/if}
            </div>
          {/if}
        </section>

      </div>

      <!-- Export bar -->
      <div class="export-bar">
        <button
          class="btn btn--primary btn--lg"
          onclick={handleDownload}
          disabled={jsonOutput.length === 0 || duplicateKeys.size > 0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Scarica JSON
        </button>
        {#if duplicateKeys.size > 0}
          <span class="export-warning" role="alert">Risolvi le chiavi duplicate prima di esportare</span>
        {:else if jsonOutput.length > 0}
          <span class="export-info">File pronto: {jsonBlobSize}</span>
        {/if}
      </div>
    {/if}

  </main>

  <!-- ===== FOOTER ===== -->
  <footer class="app-footer">
    <p>Nessun dato lascia il tuo dispositivo &mdash; tutto il parsing e la conversione avvengono localmente nel browser.</p>
  </footer>

</div>

<style>
  /* ============================================
     DESIGN TOKENS
     ============================================ */
  :global(:root) {
    --surface: #f8fafc;
    --card: #ffffff;
    --primary: #0d9488;
    --primary-hover: #0f766e;
    --primary-subtle: #f0fdfa;
    --accent: #f43f5e;
    --accent-hover: #e11d48;
    --accent-subtle: #fff1f2;
    --amber: #d97706;
    --amber-subtle: #fffbeb;
    --text: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    --border: #e2e8f0;
    --border-focus: #0d9488;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
    --radius: 8px;
    --radius-sm: 4px;
    --radius-lg: 12px;
  }

  /* ============================================
     RESET & BASE
     ============================================ */
  .sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }

  .app-shell {
    display: flex; flex-direction: column; min-height: 100vh;
    max-width: 1280px; margin: 0 auto; padding: 0 16px;
  }

  /* ============================================
     HEADER
     ============================================ */
  .app-header {
    padding: 20px 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .header-inner {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .header-brand {
    display: flex; align-items: center; gap: 12px;
  }
  .signature-icon {
    flex-shrink: 0;
  }
  .app-title {
    font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif;
    font-size: clamp(1.25rem, 3vw, 1.75rem);
    font-weight: 400;
    color: var(--text);
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .title-accent {
    color: var(--primary);
  }
  .app-subtitle {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin-top: 2px;
  }
  .header-actions {
    display: flex; gap: 8px; align-items: center;
    padding-top: 4px;
  }

  /* Badges */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 3px 8px; border-radius: 999px;
    white-space: nowrap;
  }
  .badge--local {
    background: var(--primary-subtle); color: var(--primary);
    border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  }
  .badge--count {
    background: var(--surface); color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  /* ============================================
     MAIN
     ============================================ */
  .app-main {
    flex: 1; padding: 20px 0;
  }

  /* ============================================
     ERROR BANNER
     ============================================ */
  .error-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; margin-bottom: 16px;
    background: #fef2f2; color: #991b1b;
    border: 1px solid #fecaca; border-radius: var(--radius);
    font-size: 0.875rem;
  }
  .error-banner svg { flex-shrink: 0; color: #dc2626; }
  .error-dismiss {
    margin-left: auto; background: none; border: none; cursor: pointer;
    color: #991b1b; padding: 2px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    min-width: 28px; min-height: 28px;
  }
  .error-dismiss:hover { background: #fee2e2; }
  .error-dismiss:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* ============================================
     DROP ZONE
     ============================================ */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 36px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 150ms ease, background-color 150ms ease, padding 250ms ease;
    background: var(--card);
    outline: none;
  }
  .drop-zone:focus-visible {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .drop-zone--active {
    border-color: var(--primary);
    background: var(--primary-subtle);
    border-style: solid;
  }
  .drop-zone--compact {
    padding: 12px 16px;
  }

  .drop-zone-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .drop-zone-icon { opacity: 0.7; margin-bottom: 4px; }
  .drop-zone-text { font-size: 1rem; color: var(--text); margin: 0; }
  .drop-zone-text strong { font-weight: 600; }
  .drop-zone-hint { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }

  .link-btn {
    background: none; border: none; color: var(--primary); cursor: pointer;
    font-size: inherit; font-family: inherit; text-decoration: underline;
    text-underline-offset: 2px; padding: 0;
  }
  .link-btn:hover { color: var(--primary-hover); }
  .link-btn:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; border-radius: 2px; }

  .drop-zone-file {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .drop-zone-filename {
    font-weight: 600; font-size: 0.9375rem; color: var(--text);
  }
  .drop-zone-meta {
    font-size: 0.8125rem; color: var(--text-secondary);
    margin-right: auto;
  }

  /* ============================================
     BUTTONS
     ============================================ */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.8125rem; font-weight: 500;
    border: none; border-radius: var(--radius); cursor: pointer;
    padding: 8px 14px; line-height: 1.4;
    transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
    white-space: nowrap; min-height: 36px;
    text-decoration: none;
  }
  .btn:focus-visible {
    outline: 2px solid var(--border-focus); outline-offset: 2px;
  }
  .btn:disabled {
    opacity: 0.5; cursor: not-allowed;
  }
  .btn--sm { padding: 4px 10px; font-size: 0.75rem; min-height: 30px; }
  .btn--lg { padding: 12px 24px; font-size: 0.9375rem; min-height: 48px; }

  .btn--ghost {
    background: transparent; color: var(--text-secondary);
  }
  .btn--ghost:hover { background: var(--surface); color: var(--text); }
  .btn--ghost:active { background: var(--border); }

  .btn--danger { color: var(--accent); }
  .btn--danger:hover { background: var(--accent-subtle); color: var(--accent-hover); }

  .btn--primary {
    background: var(--primary); color: #ffffff;
  }
  .btn--primary:hover { background: var(--primary-hover); }
  .btn--primary:active { background: #0e7b72; }
  .btn--primary:focus-visible { outline-color: var(--primary); }

  /* ============================================
     TOOL AREA
     ============================================ */
  .tool-area {
    display: grid; grid-template-columns: 1fr;
    gap: 16px; margin-top: 16px;
  }
  @media (min-width: 900px) {
    .tool-area {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* ============================================
     PANELS
     ============================================ */
  .panel {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px; padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .panel-title {
    font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif;
    font-size: 1.0625rem; font-weight: 400; color: var(--text);
    margin: 0; line-height: 1.3;
  }
  .panel-header-actions {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .panel-body {
    flex: 1; overflow: auto;
  }

  .hint-fade {
    font-size: 0.75rem; color: var(--primary); font-weight: 500;
    animation: hintFadeIn 300ms ease, hintFadeOut 300ms ease 1.7s forwards;
  }
  @keyframes hintFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes hintFadeOut { from { opacity: 1; } to { opacity: 0; } }

  /* ============================================
     MAPPING EDITOR
     ============================================ */
  .mapping-body { padding: 0; }
  .mapping-header-row {
    display: none;
    padding: 8px 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
    gap: 10px;
  }
  @media (min-width: 600px) {
    .mapping-header-row { display: flex; }
  }
  .mapping-col-label { flex: 1; }
  .mapping-col-label.mapping-preview-label { flex: 0 0 120px; }

  .mapping-list {
    list-style: none; padding: 0; margin: 0;
    max-height: 420px; overflow-y: auto;
  }
  .mapping-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-bottom: 1px solid var(--border);
    transition: background-color 150ms ease;
    flex-wrap: wrap;
  }
  .mapping-row:last-child { border-bottom: none; }
  .mapping-row--active { background: var(--primary-subtle); }
  .mapping-row--duplicate { background: #fffbfb; }

  .mapping-source {
    display: flex; align-items: center; gap: 8px;
    flex: 1; min-width: 100px;
  }
  .mapping-index {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: var(--radius-sm);
    background: var(--surface); font-size: 0.6875rem; font-weight: 600;
    color: var(--text-muted); flex-shrink: 0;
    border: 1px solid var(--border);
  }
  .mapping-csv-col {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.8125rem; color: var(--text); word-break: break-all;
    line-height: 1.4;
  }

  .mapping-connector {
    flex-shrink: 0; color: var(--text-muted);
    display: flex; align-items: center;
  }
  .mapping-row--active .mapping-connector { color: var(--primary); }
  .connector-svg { display: block; }

  .mapping-target {
    flex: 1; min-width: 120px; position: relative;
    display: flex; flex-direction: column;
  }
  .mapping-input {
    width: 100%; padding: 6px 10px; font-size: 0.8125rem;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    background: var(--card); color: var(--text);
    transition: border-color 150ms ease, box-shadow 150ms ease;
    line-height: 1.5; min-height: 34px;
  }
  .mapping-input::placeholder { color: var(--text-muted); font-style: italic; }
  .mapping-input:focus {
    outline: none; border-color: var(--border-focus);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
  }
  .mapping-input--duplicate {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .mapping-input--duplicate:focus {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
  }

  .field-hint {
    font-size: 0.6875rem; margin-top: 3px; line-height: 1.3;
  }
  .field-hint--error { color: var(--accent); font-weight: 500; }
  .field-hint--muted { color: var(--text-muted); }

  .mapping-preview {
    flex: 0 0 120px; min-width: 80px;
    display: none;
  }
  @media (min-width: 600px) { .mapping-preview { display: block; } }
  .mapping-preview-value {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.75rem; color: var(--text-secondary);
    word-break: break-all; display: block;
    max-height: 2.4em; overflow: hidden;
    line-height: 1.3;
  }

  .mapping-arrow {
    width: 24px; flex-shrink: 0;
    display: none;
  }
  @media (min-width: 600px) { .mapping-arrow { display: block; } }

  .mapping-summary {
    padding: 8px 12px; border-top: 1px solid var(--border);
    font-size: 0.75rem; color: var(--text-secondary);
    background: var(--surface);
    display: flex; gap: 4px; flex-wrap: wrap;
  }
  .text-muted { color: var(--text-muted); }
  .text-warning { color: var(--accent); font-weight: 500; }

  /* ============================================
     JSON PREVIEW
     ============================================ */
  .preview-body {
    padding: 0;
  }
  .json-preview {
    margin: 0; padding: 14px 16px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.75rem; line-height: 1.6;
    color: var(--text); background: var(--card);
    overflow: auto; max-height: 420px;
    tab-size: 2; -moz-tab-size: 2;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }
  .json-preview code {
    font-family: inherit;
    white-space: pre;
  }
  .preview-empty {
    padding: 32px 16px; text-align: center;
    color: var(--text-muted); font-size: 0.875rem;
  }

  /* ============================================
     EXPORT BAR
     ============================================ */
  .export-bar {
    display: flex; align-items: center; gap: 14px;
    margin-top: 20px; padding: 14px 0;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .export-warning {
    font-size: 0.8125rem; color: var(--accent); font-weight: 500;
  }
  .export-info {
    font-size: 0.75rem; color: var(--text-muted);
  }

  /* ============================================
     FOOTER
     ============================================ */
  .app-footer {
    padding: 16px 0; border-top: 1px solid var(--border);
    text-align: center; font-size: 0.75rem; color: var(--text-muted);
  }
  .app-footer p { margin: 0; }

  /* ============================================
     RESPONSIVE
     ============================================ */
  @media (max-width: 599px) {
    .app-shell { padding: 0 10px; }
    .app-header { padding: 14px 0 10px; }
    .header-brand { gap: 8px; }
    .signature-icon { width: 32px; height: 32px; }
    .drop-zone { padding: 24px 14px; }
    .drop-zone--compact { padding: 10px 12px; }
    .mapping-row { padding: 10px 10px; gap: 6px; }
    .mapping-connector { display: none; }
    .export-bar { flex-direction: column; align-items: stretch; gap: 8px; }
    .btn--lg { justify-content: center; }
    .tool-area { gap: 12px; margin-top: 12px; }
  }
</style>
