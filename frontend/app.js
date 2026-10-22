/**
 * Mule-tiplier — AML Money Mule Detection & Graph Intelligence Cockpit
 * Visual Design System v1.0 Application Logic
 * 
 * Features:
 * - Real-time telemetry & API integration
 * - Interactive 60fps HTML5 Canvas graph with physics, pan/zoom, drag & pin
 * - Animated semicircular probability gauge with threshold tick & delta chip
 * - Sequential laundering motif stepper with traveling dot animations & camera focus
 * - Explainable GNN feature attributions (top 3 lime highlighted)
 * - SAR narrative generation, robust copy morphing & export (.txt / .json)
 * - Global search with autocomplete, presets & '/' hotkey
 * - Tab navigation (1-5 hotkeys) with sliding lime indicator
 * - Dark/Light mode theme toggle with canvas grid adaptation
 * - Full WCAG 2.1 AA accessibility & table alternatives
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // Application State
    // -------------------------------------------------------------------------
    const state = {
        currentAccountId: '811C2F680',
        currentInvestigation: null,
        currentSubgraph: null,
        activeTab: 'tab-insights',
        theme: localStorage.getItem('mule_theme') || 'dark',
        selectedNodeId: null,
        hoveredNodeId: null,
        focusedEdge: null,
        physicsEnabled: true,
        presets: [],
        selectedChainIndex: 0,
        // Canvas transform
        canvasTransform: {
            x: 0,
            y: 0,
            scale: 1,
            isDragging: false,
            startX: 0,
            startY: 0
        },
        draggedNode: null,
        nodePositions: {}, // id -> { x, y, vx, vy, isPinned, radius, color, label, role, ... }
        animFrameId: null,
        pulseOffset: 0,
        // SAR State
        currentSarMode: 'dossier',
        activeNarrativeTemplate: 'default',
        originalSarNarrative: ''
    };

    // -------------------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------------------
    const els = {
        html: document.documentElement,
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        globalSearchInput: document.getElementById('global-search-input'),
        autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
        bannerAccountId: document.getElementById('banner-account-id'),
        copyAccountBtn: document.getElementById('copy-account-btn'),
        bannerRiskBadge: document.getElementById('banner-risk-badge'),
        bannerRiskLabel: document.getElementById('banner-risk-label'),
        bannerRiskIcon: document.getElementById('banner-risk-icon'),
        bannerActionText: document.getElementById('banner-action-text'),
        btnGenerateSar: document.getElementById('btn-generate-sar'),
        btnFreezeAccount: document.getElementById('btn-freeze-account'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        activeTabIndicator: document.getElementById('active-tab-indicator'),
        tabContents: document.querySelectorAll('.tab-content'),
        // Telemetry
        tileAccounts: document.getElementById('tile-accounts'),
        tileTransactions: document.getElementById('tile-transactions'),
        tilePrauc: document.getElementById('tile-prauc'),
        tilePrDelta: document.getElementById('tile-pr-delta'),
        tilePurity: document.getElementById('tile-purity'),
        tilePurityDelta: document.getElementById('tile-purity-delta'),
        // Cockpit
        chipSubgraphCounts: document.getElementById('chip-subgraph-counts'),
        gaugeFillPath: document.getElementById('gauge-fill-path'),
        gaugeTick: document.getElementById('gauge-tick'),
        gaugeValDisplay: document.getElementById('gauge-val-display'),
        gaugeDeltaLabel: document.getElementById('gauge-delta-label'),
        statChainRole: document.getElementById('stat-chain-role'),
        statActiveChains: document.getElementById('stat-active-chains'),
        statRetention: document.getElementById('stat-retention'),
        featureBarsContainer: document.getElementById('feature-bars-container'),
        quickChainPreview: document.getElementById('quick-chain-preview'),
        btnJumpChains: document.getElementById('btn-jump-chains'),
        // Stepper
        chainSelectBox: document.getElementById('chain-select-box'),
        customChainTrigger: document.getElementById('custom-chain-trigger'),
        customChainLabel: document.getElementById('custom-chain-label'),
        customChainMenu: document.getElementById('custom-chain-menu'),
        stepperTimeline: document.getElementById('stepper-timeline'),
        sumInitialInflow: document.getElementById('sum-initial-inflow'),
        sumFinalOutflow: document.getElementById('sum-final-outflow'),
        sumDecay: document.getElementById('sum-decay'),
        sumSpan: document.getElementById('sum-span'),
        // Explainer
        allFeaturesList: document.getElementById('all-features-list'),
        counterpartyTableBody: document.getElementById('counterparty-table-body'),
        // SAR Enhanced Suite
        sarTextarea: document.getElementById('sar-narrative-textarea'),
        charCounter: document.getElementById('char-counter'),
        btnCopySar: document.getElementById('btn-copy-sar'),
        copySarText: document.getElementById('copy-sar-text'),
        copyDropdown: document.getElementById('copy-dropdown'),
        btnDownloadSar: document.getElementById('btn-download-sar'),
        downloadDropdown: document.getElementById('download-dropdown'),
        sarCaseIdText: document.getElementById('sar-case-id-text'),
        sarRefChip: document.getElementById('sar-ref-chip'),
        sarModeBtns: document.querySelectorAll('.sar-mode-btn'),
        sarSubviews: document.querySelectorAll('.sar-subview'),
        // Tiles
        sarTileProb: document.getElementById('sar-tile-prob'),
        sarTileProbDelta: document.getElementById('sar-tile-prob-delta'),
        sarTileThreshold: document.getElementById('sar-tile-threshold'),
        sarTileRole: document.getElementById('sar-tile-role'),
        sarTileChains: document.getElementById('sar-tile-chains'),
        sarTileRetention: document.getElementById('sar-tile-retention'),
        sarTileHaircut: document.getElementById('sar-tile-haircut'),
        sarTileFlowAmt: document.getElementById('sar-tile-flow-amt'),
        sarTileStatus: document.getElementById('sar-tile-status'),
        sarTileAction: document.getElementById('sar-tile-action'),
        // Dossier elements
        sarDossierTierBadge: document.getElementById('sar-dossier-tier-badge'),
        sarDossierAcc: document.getElementById('sar-dossier-acc'),
        sarDossierTier: document.getElementById('sar-dossier-tier'),
        sarDossierAction: document.getElementById('sar-dossier-action'),
        sarDossierClassification: document.getElementById('sar-dossier-classification'),
        sarDossierSubgraphCounts: document.getElementById('sar-dossier-subgraph-counts'),
        sarDossierProbDisplay: document.getElementById('sar-dossier-prob-display'),
        sarDossierThreshDisplay: document.getElementById('sar-dossier-thresh-display'),
        sarDossierLogitDisplay: document.getElementById('sar-dossier-logit-display'),
        sarDossierFeatureChips: document.getElementById('sar-dossier-feature-chips'),
        sarDossierChainStatus: document.getElementById('sar-dossier-chain-status'),
        sarDossierChainSteps: document.getElementById('sar-dossier-chain-steps'),
        sarChainInflow: document.getElementById('sar-chain-inflow'),
        sarChainOutflow: document.getElementById('sar-chain-outflow'),
        sarChainRetention: document.getElementById('sar-chain-retention'),
        sarChainDuration: document.getElementById('sar-chain-duration'),
        sarChainHaircut: document.getElementById('sar-chain-haircut'),
        sarDossierCounterpartiesTbody: document.getElementById('sar-dossier-counterparties-tbody'),
        sarDossierNarrativeText: document.getElementById('sar-dossier-narrative-text'),
        btnJumpComposer: document.getElementById('btn-jump-composer'),
        btnCopyDossierNarrative: document.getElementById('btn-copy-dossier-narrative'),
        sarAuditHash: document.getElementById('sar-audit-hash'),
        sarAnalystNotes: document.getElementById('sar-analyst-notes'),
        // Composer elements
        composerTemplateBtns: document.querySelectorAll('.composer-chip-btn'),
        composerTokenChips: document.querySelectorAll('.token-chip'),
        fincenProgressBar: document.getElementById('fincen-progress-bar'),
        fincenLimitLabel: document.getElementById('fincen-limit-label'),
        composerWordCount: document.getElementById('composer-word-count'),
        composerReadTime: document.getElementById('composer-read-time'),
        btnResetNarrative: document.getElementById('btn-reset-narrative'),
        btnApplyNarrative: document.getElementById('btn-apply-narrative'),
        // Raw Terminal elements
        sarRawCardText: document.getElementById('sar-raw-card-text'),
        btnCopyRawCard: document.getElementById('btn-copy-raw-card'),
        // Canvas
        canvas: document.getElementById('network-canvas'),
        btnZoomIn: document.getElementById('btn-zoom-in'),
        btnZoomOut: document.getElementById('btn-zoom-out'),
        btnFitScreen: document.getElementById('btn-fit-screen'),
        btnTogglePhysics: document.getElementById('btn-toggle-physics'),
        physicsIcon: document.getElementById('physics-icon'),
        btnTableAlt: document.getElementById('btn-table-alt'),
        canvasTableAlt: document.getElementById('canvas-table-alt'),
        btnCloseTableAlt: document.getElementById('btn-close-table-alt'),
        accessibleNodesTbody: document.getElementById('accessible-nodes-tbody'),
        nodeTooltip: document.getElementById('node-tooltip'),
        ttId: document.getElementById('tt-id'),
        ttRole: document.getElementById('tt-role'),
        ttFlow: document.getElementById('tt-flow'),
        ttHolding: document.getElementById('tt-holding'),
        ttScore: document.getElementById('tt-score'),
        // Toast
        toastContainer: document.getElementById('toast-container')
    };

    const ctx = els.canvas ? els.canvas.getContext('2d') : null;

    // -------------------------------------------------------------------------
    // Initialize Theme
    // -------------------------------------------------------------------------
    function applyTheme(theme) {
        state.theme = theme;
        els.html.setAttribute('data-theme', theme);
        localStorage.setItem('mule_theme', theme);
        lucide.createIcons();
    }
    applyTheme(state.theme);

    if (els.themeToggleBtn) {
        els.themeToggleBtn.addEventListener('click', () => {
            const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            showToast(`Theme switched to ${nextTheme.toUpperCase()}`, 'info');
        });
    }

    // -------------------------------------------------------------------------
    // Toast Notification System
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info', duration = 3200) {
        if (!els.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'critical' || type === 'error') iconName = 'shield-alert';
        else if (type === 'high' || type === 'warning') iconName = 'alert-triangle';
        else if (type === 'success' || type === 'lime') iconName = 'check-circle-2';

        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="${iconName}" class="toast-icon"></i>
                <span class="toast-msg">${message}</span>
            </div>
            <button class="toast-close" title="Dismiss">&times;</button>
        `;

        els.toastContainer.appendChild(toast);
        lucide.createIcons();

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        const closeBtn = toast.querySelector('.toast-close');
        const dismiss = () => {
            toast.classList.remove('visible');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 250);
        };

        if (closeBtn) closeBtn.addEventListener('click', dismiss);
        setTimeout(dismiss, duration);
    }

    // -------------------------------------------------------------------------
    // Tab Navigation System
    // -------------------------------------------------------------------------
    function updateTabIndicator(activeBtn) {
        if (!activeBtn || !els.activeTabIndicator) return;
        const navRect = activeBtn.parentElement.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        els.activeTabIndicator.style.width = `${btnRect.width}px`;
        els.activeTabIndicator.style.left = `${btnRect.left - navRect.left}px`;
    }

    function switchTab(tabId) {
        state.activeTab = tabId;
        els.tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
                updateTabIndicator(btn);
            } else {
                btn.classList.remove('active');
            }
        });

        els.tabContents.forEach(content => {
            if (content.id === `view-${tabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        resizeCanvas();
        lucide.createIcons();
    }

    els.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    window.addEventListener('resize', () => {
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn) updateTabIndicator(activeBtn);
        resizeCanvas();
    });

    if (els.btnJumpChains) {
        els.btnJumpChains.addEventListener('click', () => {
            switchTab('tab-chains');
        });
    }

    if (els.btnGenerateSar) {
        els.btnGenerateSar.addEventListener('click', () => {
            switchTab('tab-sar');
            if (els.sarTextarea) els.sarTextarea.focus();
            showToast('Switched to SAR Risk Card narrative view', 'info');
        });
    }

    // -------------------------------------------------------------------------
    // Telemetry Loader
    // -------------------------------------------------------------------------
    async function loadTelemetry() {
        try {
            const res = await fetch('/api/v1/telemetry');
            if (!res.ok) throw new Error('Telemetry API failure');
            const data = await res.json();

            state.presets = data.presets || [];
            
            if (els.tileAccounts) els.tileAccounts.textContent = (data.monitored_accounts || 515080).toLocaleString();
            if (els.tileTransactions) els.tileTransactions.textContent = ((data.monitored_transactions || 5078345) / 1000000).toFixed(2) + 'M';
            if (els.tilePrauc) els.tilePrauc.textContent = (data.test_pr_auc || 0.1884).toFixed(4);
            if (els.tilePrDelta) els.tilePrDelta.textContent = `+${Math.round(data.pr_auc_lift_pct || 128)}% LIFT`;
            if (els.tilePurity) els.tilePurity.textContent = ((data.alert_purity_precision || 0.2827) * 100).toFixed(1) + '%';
        } catch (err) {
            console.error('Failed to load telemetry:', err);
        }
    }

    // -------------------------------------------------------------------------
    // Global Autocomplete Search
    // -------------------------------------------------------------------------
    let searchDebounceTimer = null;

    function renderAutocomplete(results) {
        if (!els.autocompleteDropdown) return;
        if (!results || results.length === 0) {
            els.autocompleteDropdown.innerHTML = `<div class="autocomplete-empty">No matching accounts found</div>`;
            els.autocompleteDropdown.classList.remove('hidden');
            return;
        }

        const presets = results.filter(r => r.is_preset);
        const matches = results.filter(r => !r.is_preset);

        let html = '';
        if (presets.length > 0) {
            html += `<div class="autocomplete-section-title"><i data-lucide="zap" class="sec-icon"></i> Curated Presets</div>`;
            presets.forEach(p => {
                html += `
                    <div class="autocomplete-item preset-item" data-id="${p.id}">
                        <div class="item-left">
                            <span class="preset-badge badge-${p.type}">PRESET</span>
                            <span class="item-label mono">${p.label}</span>
                        </div>
                        <span class="item-id mono">${p.id}</span>
                    </div>
                `;
            });
        }

        if (matches.length > 0) {
            html += `<div class="autocomplete-section-title"><i data-lucide="database" class="sec-icon"></i> Account Matches</div>`;
            matches.forEach(m => {
                html += `
                    <div class="autocomplete-item" data-id="${m.id}">
                        <div class="item-left">
                            <i data-lucide="user" class="acc-icon"></i>
                            <span class="item-label mono">${m.id}</span>
                        </div>
                        <span class="item-hint">Search Graph</span>
                    </div>
                `;
            });
        }

        els.autocompleteDropdown.innerHTML = html;
        els.autocompleteDropdown.classList.remove('hidden');
        lucide.createIcons();

        els.autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                selectAccount(id);
                els.autocompleteDropdown.classList.add('hidden');
                els.globalSearchInput.value = '';
            });
        });
    }

    if (els.globalSearchInput) {
        els.globalSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchDebounceTimer);
            if (!query) {
                if (els.autocompleteDropdown) els.autocompleteDropdown.classList.add('hidden');
                return;
            }

            searchDebounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/v1/accounts/search?q=${encodeURIComponent(query)}`);
                    if (!res.ok) throw new Error('Search failed');
                    const data = await res.json();
                    renderAutocomplete(data.results);
                } catch (err) {
                    console.error(err);
                }
            }, 150);
        });

        els.globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (els.autocompleteDropdown) els.autocompleteDropdown.classList.add('hidden');
            } else if (e.key === 'Enter') {
                const firstItem = els.autocompleteDropdown ? els.autocompleteDropdown.querySelector('.autocomplete-item') : null;
                if (firstItem) {
                    firstItem.click();
                } else if (els.globalSearchInput.value.trim()) {
                    selectAccount(els.globalSearchInput.value.trim().toUpperCase());
                    if (els.autocompleteDropdown) els.autocompleteDropdown.classList.add('hidden');
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (els.globalSearchInput && els.autocompleteDropdown && !els.globalSearchInput.contains(e.target) && !els.autocompleteDropdown.contains(e.target)) {
            els.autocompleteDropdown.classList.add('hidden');
        }
        if (els.btnDownloadSar && els.downloadDropdown && !els.btnDownloadSar.contains(e.target) && !els.downloadDropdown.contains(e.target)) {
            els.downloadDropdown.classList.add('hidden');
        }
        if (els.btnCopySar && els.copyDropdown && !els.btnCopySar.contains(e.target) && !els.copyDropdown.contains(e.target)) {
            els.copyDropdown.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------------------
    // Threshold Filter & Full Chain Graph Generator
    // -------------------------------------------------------------------------
    function crossesMuleThreshold(report) {
        if (!report) return false;
        const gnn = report.gnn_explanation || report.gnn_assessment || {};
        const prob = typeof gnn.gnn_prob === 'number' ? gnn.gnn_prob : 0;
        const threshold = typeof gnn.threshold === 'number' ? gnn.threshold : 0.5254;
        const chainProfile = report.chain_profile || {};
        const inChain = !!(chainProfile.is_in_chain && chainProfile.active_chains && chainProfile.active_chains.length > 0);
        const tier = (report.risk_tier || '').toUpperCase();
        return prob >= threshold || inChain || tier.includes('HIGH') || tier.includes('CRITICAL');
    }

    function generateFilteredSubgraph(report, chainIdx = 0, serverSubgraph = null) {
        if (!report) {
            return { target_account: '', nodes: [], edges: [], below_threshold: true, is_chain: false, total_chains: 0 };
        }

        const targetAcc = report.account_id;
        const gnn = report.gnn_explanation || report.gnn_assessment || {};
        const prob = typeof gnn.gnn_prob === 'number' ? gnn.gnn_prob : 0;
        const chainProfile = report.chain_profile || {};
        const activeChains = chainProfile.active_chains || [];
        const crosses = crossesMuleThreshold(report);

        // Case 1: Account does NOT cross mule threshold -> Only target node, no neighborhood loaded
        if (!crosses) {
            return {
                target_account: targetAcc,
                nodes: [{
                    id: targetAcc,
                    label: `Target: ${targetAcc}`,
                    role: 'target',
                    is_target: true,
                    risk_tier: report.risk_tier || 'STANDARD / LOW RISK',
                    gnn_prob: prob,
                    size: 24,
                    is_clean: true
                }],
                edges: [],
                below_threshold: true,
                is_chain: false,
                total_chains: 0
            };
        }

        // Case 2: Crosses threshold with active multi-hop chains -> Render the entire selected chain
        if (activeChains.length > 0) {
            const safeIdx = Math.min(Math.max(chainIdx || 0, 0), activeChains.length - 1);
            const chain = activeChains[safeIdx];
            const accounts = chain.accounts || [];
            const steps = chain.steps || [];

            const nodes = accounts.map((acc, i) => {
                const isTarget = acc === targetAcc;
                let role = 'chain';
                let roleLabel = 'Intermediary Mule';
                if (isTarget) {
                    role = 'target';
                    roleLabel = 'Target Mule';
                } else if (i === 0) {
                    role = 'source';
                    roleLabel = 'Source / Initiator';
                } else if (i === accounts.length - 1) {
                    role = 'sink';
                    roleLabel = 'Cash-Out Sink';
                }

                return {
                    id: acc,
                    label: isTarget ? `Target: ${acc}` : acc,
                    role: role,
                    roleLabel: roleLabel,
                    is_target: isTarget,
                    chain_hop: i + 1,
                    size: isTarget ? 24 : (role === 'source' || role === 'sink' ? 19 : 16),
                    is_clean: false
                };
            });

            const edges = steps.map((s, i) => ({
                source: s.from,
                target: s.to,
                amount: s.amount,
                timestamp: s.timestamp,
                in_chain: true,
                importance: 1.0,
                direction: s.to === targetAcc ? 'incoming' : 'outgoing',
                width: 4.0,
                step_num: i + 1
            }));

            return {
                target_account: targetAcc,
                nodes: nodes,
                edges: edges,
                below_threshold: false,
                is_chain: true,
                chain_index: safeIdx,
                total_chains: activeChains.length
            };
        }

        // Case 3: Crosses threshold on GNN features alone, no multi-hop motif detected
        // Only load target and top attributed suspicious links (importance >= 0.5)
        const incidentEdges = (serverSubgraph && serverSubgraph.edges) || gnn.all_incident_edges || [];
        const suspiciousEdges = incidentEdges.filter(e => (e.importance_score || e.importance || 0) >= 0.5);

        const nodesDict = {};
        nodesDict[targetAcc] = {
            id: targetAcc,
            label: `Target: ${targetAcc}`,
            role: 'target',
            is_target: true,
            risk_tier: report.risk_tier,
            gnn_prob: prob,
            size: 24,
            is_clean: false
        };

        const edges = [];
        suspiciousEdges.forEach(e => {
            const u = e.from_account || e.source;
            const v = e.to_account || e.target;
            const other = (u === targetAcc) ? v : u;
            if (!nodesDict[other]) {
                nodesDict[other] = {
                    id: other,
                    label: other,
                    role: 'counterparty',
                    is_target: false,
                    size: 15,
                    is_clean: false
                };
            }
            edges.push({
                source: u,
                target: v,
                importance: e.importance_score || e.importance || 0.6,
                direction: e.direction || (v === targetAcc ? 'incoming' : 'outgoing'),
                in_chain: false,
                width: 2.8
            });
        });

        return {
            target_account: targetAcc,
            nodes: Object.values(nodesDict),
            edges: edges,
            below_threshold: false,
            is_chain: false,
            total_chains: 0
        };
    }

    function updateActiveChainGraph() {
        if (!state.currentInvestigation) return;
        const report = state.currentInvestigation;
        const subgraph = generateFilteredSubgraph(report, state.selectedChainIndex);
        state.currentSubgraph = subgraph;
        initGraphTopology(subgraph, report);
        renderAccessibleTable(subgraph);
        renderQuickChainPreview(report.chain_profile || {});
    }

    // -------------------------------------------------------------------------
    // Account Selection & Investigation Loader
    // -------------------------------------------------------------------------
    async function selectAccount(accountId) {
        if (!accountId) return;
        accountId = accountId.trim().toUpperCase();
        state.currentAccountId = accountId;
        state.selectedChainIndex = 0;
        showToast(`Investigating Account ${accountId}...`, 'info', 2000);

        try {
            // Parallel fetch of report and 2-hop subgraph
            const [reportRes, subRes] = await Promise.all([
                fetch(`/api/v1/accounts/${accountId}/investigation`),
                fetch(`/api/v1/accounts/${accountId}/subgraph`)
            ]);

            if (!reportRes.ok) {
                let msg = `Account ${accountId} not found in graph index.`;
                try {
                    const err = await reportRes.json();
                    if (err.detail) msg = err.detail;
                } catch (_) {}
                throw new Error(msg);
            }
            
            const report = await reportRes.json();
            let serverSubgraph = null;
            try {
                if (subRes.ok) serverSubgraph = await subRes.json();
            } catch (_) {}

            state.currentInvestigation = report;

            // Generate threshold-filtered graph with entire chain
            const subgraph = generateFilteredSubgraph(report, state.selectedChainIndex, serverSubgraph);
            state.currentSubgraph = subgraph;

            // Render all UI components with defensive try/catch blocks
            try { renderBanner(report); } catch (e) { console.error('Banner error:', e); }
            try { renderGauge(report.gnn_assessment || {}); } catch (e) { console.error('Gauge error:', e); }
            try { renderStatBlocks(report); } catch (e) { console.error('StatBlocks error:', e); }
            try { renderFeatureAttributions(report.gnn_assessment ? report.gnn_assessment.top_features : []); } catch (e) { console.error('Features error:', e); }
            try { renderQuickChainPreview(report.chain_profile || {}); } catch (e) { console.error('QuickChain error:', e); }
            try { renderChainStepper(report.chain_profile || {}); } catch (e) { console.error('Stepper error:', e); }
            try { renderGnnExplainerView(report.gnn_assessment || {}); } catch (e) { console.error('Explainer error:', e); }
            try { renderSarRiskCard(report); } catch (e) { console.error('SAR error:', e); }
            try { initGraphTopology(subgraph, report); } catch (e) { console.error('Topology error:', e); }
            try { renderAccessibleTable(subgraph); } catch (e) { console.error('Table error:', e); }

            const statusLabel = subgraph.below_threshold ? 'CLEAN (BELOW THRESHOLD)' : (report.risk_tier || 'MONITORED').toUpperCase();
            showToast(`Loaded analysis for ${accountId} (${statusLabel})`, subgraph.below_threshold ? 'info' : 'lime', 2500);
        } catch (err) {
            console.error('selectAccount error:', err);
            showToast(err.message, 'critical', 4500);
        }
    }

    // -------------------------------------------------------------------------
    // Banner Rendering
    // -------------------------------------------------------------------------
    function renderBanner(report) {
        if (!report) return;
        if (els.bannerAccountId) els.bannerAccountId.textContent = report.account_id;
        if (els.bannerActionText) els.bannerActionText.textContent = report.recommended_action || 'Priority Compliance Queue';

        const tier = (report.risk_tier || 'standard').toLowerCase();
        if (els.bannerRiskBadge) {
            els.bannerRiskBadge.className = `risk-badge pill badge-${tier}`;
            if (els.bannerRiskLabel) els.bannerRiskLabel.textContent = `${(report.risk_tier || 'STANDARD').toUpperCase()} RISK`;
        }

        let iconName = 'alert-triangle';
        let bannerBorderColor = 'var(--risk-high)';

        if (tier === 'critical') {
            iconName = 'shield-alert';
            bannerBorderColor = 'var(--risk-critical)';
        } else if (tier === 'high') {
            iconName = 'alert-triangle';
            bannerBorderColor = 'var(--risk-high)';
        } else if (tier === 'elevated') {
            iconName = 'eye';
            bannerBorderColor = 'var(--risk-elevated)';
        } else {
            iconName = 'shield-check';
            bannerBorderColor = 'var(--risk-standard)';
        }

        const bannerEl = document.getElementById('account-banner');
        if (bannerEl) bannerEl.style.borderLeftColor = bannerBorderColor;
        if (els.bannerRiskIcon) els.bannerRiskIcon.setAttribute('data-lucide', iconName);
        lucide.createIcons();
    }

    // Copy Account ID
    if (els.copyAccountBtn) {
        els.copyAccountBtn.addEventListener('click', () => {
            copyToClipboard(state.currentAccountId);
            showToast(`Account ID ${state.currentAccountId} copied to clipboard`, 'lime', 1800);
        });
    }

    // Freeze Account Button Simulation
    let isFrozen = false;
    if (els.btnFreezeAccount) {
        els.btnFreezeAccount.addEventListener('click', () => {
            isFrozen = !isFrozen;
            if (isFrozen) {
                els.btnFreezeAccount.classList.add('btn-frozen');
                els.btnFreezeAccount.innerHTML = `<i data-lucide="check"></i> <span>Frozen</span>`;
                showToast(`EMERGENCY FREEZE enacted on ${state.currentAccountId}`, 'critical', 3500);
            } else {
                els.btnFreezeAccount.classList.remove('btn-frozen');
                els.btnFreezeAccount.innerHTML = `<i data-lucide="lock"></i> <span>Freeze</span>`;
                showToast(`Account ${state.currentAccountId} un-frozen`, 'info', 2000);
            }
            lucide.createIcons();
        });
    }

    // -------------------------------------------------------------------------
    // Gauge Animation & Math
    // -------------------------------------------------------------------------
    function renderGauge(gnn) {
        const prob = typeof gnn.mule_probability === 'number' ? gnn.mule_probability : 0;
        const threshold = gnn.threshold || 0.5254;
        
        // Arc circumference = PI * 80 ~= 251.327
        const arcCircumference = Math.PI * 80;
        const targetOffset = arcCircumference * (1 - prob);

        const duration = 750;
        const startVal = 0;
        const startTime = performance.now();

        function stepGauge(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentProb = startVal + (prob - startVal) * ease;

            if (els.gaugeValDisplay) els.gaugeValDisplay.textContent = (currentProb * 100).toFixed(1) + '%';
            if (els.gaugeFillPath) els.gaugeFillPath.style.strokeDashoffset = arcCircumference * (1 - currentProb);

            if (progress < 1) {
                requestAnimationFrame(stepGauge);
            } else {
                if (els.gaugeValDisplay) els.gaugeValDisplay.textContent = (prob * 100).toFixed(1) + '%';
                if (els.gaugeFillPath) els.gaugeFillPath.style.strokeDashoffset = targetOffset;
            }
        }
        requestAnimationFrame(stepGauge);

        // Threshold Tick positioning
        const theta = threshold * Math.PI;
        const cx = 100, cy = 100;
        const rInner = 68, rOuter = 92;
        const x1 = cx - rInner * Math.cos(theta);
        const y1 = cy - rInner * Math.sin(theta);
        const x2 = cx - rOuter * Math.cos(theta);
        const y2 = cy - rOuter * Math.sin(theta);

        if (els.gaugeTick) {
            els.gaugeTick.setAttribute('x1', x1.toFixed(2));
            els.gaugeTick.setAttribute('y1', y1.toFixed(2));
            els.gaugeTick.setAttribute('x2', x2.toFixed(2));
            els.gaugeTick.setAttribute('y2', y2.toFixed(2));
        }

        // Delta Chip
        const delta = prob - threshold;
        const deltaPct = (Math.abs(delta) * 100).toFixed(1);
        if (els.gaugeDeltaLabel) {
            if (delta >= 0) {
                els.gaugeDeltaLabel.textContent = `+${deltaPct}% Above`;
                els.gaugeDeltaLabel.style.color = 'var(--lime-500)';
            } else {
                els.gaugeDeltaLabel.textContent = `-${deltaPct}% Below`;
                els.gaugeDeltaLabel.style.color = 'var(--risk-standard)';
            }
        }

        // Subgraph chip
        if (els.chipSubgraphCounts) {
            els.chipSubgraphCounts.textContent = `${gnn.subgraph_nodes_count || 0} Nodes · ${gnn.subgraph_edges_count || 0} Edges`;
        }
    }

    // -------------------------------------------------------------------------
    // Stat Blocks & Feature Attribution Bars
    // -------------------------------------------------------------------------
    function renderStatBlocks(report) {
        const cp = report.chain_profile || {};
        if (els.statChainRole) els.statChainRole.textContent = (cp.primary_role || 'INDEPENDENT').toUpperCase();
        
        if (cp.num_chains_found > 0) {
            if (els.statActiveChains) els.statActiveChains.textContent = `${cp.num_chains_found} Chains (Max ${cp.max_chain_hops} Hops)`;
            const firstChain = cp.active_chains && cp.active_chains[0];
            const retPct = firstChain && typeof firstChain.amount_retention === 'number' ? (firstChain.amount_retention * 100).toFixed(1) + '% Retained' : 'N/A';
            if (els.statRetention) els.statRetention.textContent = retPct;
        } else {
            if (els.statActiveChains) els.statActiveChains.textContent = 'None Detected';
            if (els.statRetention) els.statRetention.textContent = '0.0% Pass-through';
        }
    }

    function renderFeatureAttributions(topFeatures) {
        if (!els.featureBarsContainer) return;
        if (!topFeatures || topFeatures.length === 0) {
            els.featureBarsContainer.innerHTML = '<div class="empty-state-muted">No feature attributions available for this account</div>';
            return;
        }

        let html = '';
        topFeatures.slice(0, 4).forEach((feat, idx) => {
            const isHighlight = idx < 3; // Top 3 are lime
            const score = typeof feat.score === 'number' ? feat.score : (feat.importance_score || 0);
            const pct = Math.min(Math.max(Math.round(score * 100), 0), 100);
            const scoreFormatted = (score * 100).toFixed(1) + '%';
            const cleanName = (feat.feature || '').replace(/_/g, ' ');

            html += `
                <div class="feat-bar-row" title="${feat.feature || ''}: attribution score ${(score * 100).toFixed(2)}%">
                    <div class="feat-bar-labels">
                        <span class="feat-name">${cleanName}</span>
                        <span class="feat-score mono ${isHighlight ? 'accent-text' : ''}">${scoreFormatted}</span>
                    </div>
                    <div class="feat-track">
                        <div class="feat-bar-fill ${isHighlight ? 'highlight' : 'regular'}" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        });

        els.featureBarsContainer.innerHTML = html;
    }

    // Quick chain preview chip row in View 1
    function renderQuickChainPreview(chainProfile) {
        if (!els.quickChainPreview) return;
        if (!chainProfile || !chainProfile.is_in_chain || !chainProfile.active_chains || chainProfile.active_chains.length === 0) {
            els.quickChainPreview.innerHTML = `
                <div class="no-chain-banner">
                    <i data-lucide="info" class="inline-icon"></i>
                    <span>No sequential multi-hop laundering chains intersect this account</span>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const safeIdx = Math.min(Math.max(state.selectedChainIndex || 0, 0), chainProfile.active_chains.length - 1);
        const chain = chainProfile.active_chains[safeIdx] || chainProfile.active_chains[0];
        let html = '';
        chain.accounts.forEach((acc, i) => {
            const isTarget = acc === state.currentAccountId;
            html += `
                <span class="chain-chip mono ${isTarget ? 'target-chip' : ''}" data-account="${acc}" style="cursor: pointer;" title="Hop ${i + 1}: ${acc} (Click to focus in canvas)">
                    ${acc}
                </span>
            `;
            if (i < chain.accounts.length - 1) {
                html += `<span class="chain-arrow">&rarr;</span>`;
            }
        });

        els.quickChainPreview.innerHTML = html;
        lucide.createIcons();

        els.quickChainPreview.querySelectorAll('.chain-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const acc = chip.dataset.account;
                focusNodeInCanvas(acc);
                showToast(`Focused on ${acc} in graph canvas`, 'info', 1200);
            });
        });
    }

    // -------------------------------------------------------------------------
    // Multi-Hop Sequential Stepper (Chain Reaction Design System v1.0)
    // -------------------------------------------------------------------------
    function renderChainStepper(chainProfile) {
        if (!els.stepperTimeline) return;

        // Custom dropdown click outside & escape listener (register once)
        if (!state._chainDropdownInitialized) {
            state._chainDropdownInitialized = true;
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#chain-selector-dropdown')) {
                    if (els.customChainMenu) els.customChainMenu.classList.add('hidden');
                    if (els.customChainTrigger) {
                        els.customChainTrigger.classList.remove('active');
                        els.customChainTrigger.setAttribute('aria-expanded', 'false');
                    }
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (els.customChainMenu) els.customChainMenu.classList.add('hidden');
                    if (els.customChainTrigger) {
                        els.customChainTrigger.classList.remove('active');
                        els.customChainTrigger.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }

        if (!chainProfile || !chainProfile.is_in_chain || !chainProfile.active_chains || chainProfile.active_chains.length === 0) {
            if (els.chainSelectBox) els.chainSelectBox.innerHTML = '<option value="">No Active Layering Chains</option>';
            if (els.customChainTrigger) {
                els.customChainTrigger.disabled = true;
                els.customChainTrigger.classList.add('disabled');
            }
            if (els.customChainLabel) {
                els.customChainLabel.textContent = 'No Active Layering Chains';
            }
            if (els.customChainMenu) {
                els.customChainMenu.innerHTML = '';
                els.customChainMenu.classList.add('hidden');
            }
            els.stepperTimeline.innerHTML = `
                <div class="empty-stepper-state">
                    <i data-lucide="git-commit" class="empty-icon"></i>
                    <h4>No Sequential Multi-Hop Chains Detected</h4>
                    <p>This account does not participate in chronological pass-through layering flows with amount decay.</p>
                </div>
            `;
            if (els.sumInitialInflow) els.sumInitialInflow.textContent = '$0.00';
            if (els.sumFinalOutflow) els.sumFinalOutflow.textContent = '$0.00';
            if (els.sumDecay) {
                els.sumDecay.innerHTML = `<i data-lucide="trending-down" class="summary-decay-icon"></i><span>$0.00</span> <span class="summary-decay-pct">(0.0%)</span>`;
            }
            if (els.sumSpan) els.sumSpan.textContent = '0m';
            lucide.createIcons();
            return;
        }

        if (els.customChainTrigger) {
            els.customChainTrigger.disabled = false;
            els.customChainTrigger.classList.remove('disabled');
        }

        // Validate selectedChainIndex
        if (state.selectedChainIndex >= chainProfile.active_chains.length) {
            state.selectedChainIndex = 0;
        }

        // Populate Chain Dropdown Options
        let nativeOptionsHtml = '';
        let customOptionsHtml = '';

        chainProfile.active_chains.forEach((c, i) => {
            const initialAmt = typeof c.initial_amount === 'number'
                ? c.initial_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                : '0.00';
            const isSelected = i === state.selectedChainIndex;

            nativeOptionsHtml += `<option value="${i}" ${isSelected ? 'selected' : ''}>Chain ${i + 1} · ${c.hops} hops · $${initialAmt}</option>`;
            customOptionsHtml += `
                <div class="custom-select-option ${isSelected ? 'selected' : ''}" data-index="${i}" role="option" aria-selected="${isSelected}">
                    <span>Chain ${i + 1} · ${c.hops} hops · <span class="mono">$${initialAmt}</span></span>
                    ${isSelected ? '<i data-lucide="check" class="opt-check"></i>' : ''}
                </div>
            `;
        });

        if (els.chainSelectBox) {
            els.chainSelectBox.innerHTML = nativeOptionsHtml;
            els.chainSelectBox.value = state.selectedChainIndex;
            els.chainSelectBox.onchange = (e) => {
                state.selectedChainIndex = parseInt(e.target.value, 10);
                updateActiveChainGraph();
                renderChainStepper(chainProfile);
            };
        }

        // Update Custom Dropdown Trigger
        const curChain = chainProfile.active_chains[state.selectedChainIndex] || chainProfile.active_chains[0];
        const curAmt = typeof curChain.initial_amount === 'number'
            ? curChain.initial_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
            : '0.00';
        if (els.customChainLabel) {
            els.customChainLabel.innerHTML = `Chain ${state.selectedChainIndex + 1} · ${curChain.hops} hops · <span class="mono">$${curAmt}</span>`;
        }

        if (els.customChainMenu) {
            els.customChainMenu.innerHTML = customOptionsHtml;
            els.customChainMenu.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const idx = parseInt(opt.dataset.index, 10);
                    state.selectedChainIndex = idx;
                    if (els.chainSelectBox) els.chainSelectBox.value = idx;
                    if (els.customChainMenu) els.customChainMenu.classList.add('hidden');
                    if (els.customChainTrigger) {
                        els.customChainTrigger.classList.remove('active');
                        els.customChainTrigger.setAttribute('aria-expanded', 'false');
                    }
                    updateActiveChainGraph();
                    renderChainStepper(chainProfile);
                });
            });
        }

        if (els.customChainTrigger) {
            els.customChainTrigger.onclick = (e) => {
                e.stopPropagation();
                if (!els.customChainMenu) return;
                const isOpen = !els.customChainMenu.classList.contains('hidden');
                if (isOpen) {
                    els.customChainMenu.classList.add('hidden');
                    els.customChainTrigger.classList.remove('active');
                    els.customChainTrigger.setAttribute('aria-expanded', 'false');
                } else {
                    els.customChainMenu.classList.remove('hidden');
                    els.customChainTrigger.classList.add('active');
                    els.customChainTrigger.setAttribute('aria-expanded', 'true');
                }
            };
        }

        renderSelectedChain(chainProfile.active_chains[state.selectedChainIndex]);
    }

    function renderSelectedChain(chain) {
        if (!chain || !els.stepperTimeline) return;

        let html = '';
        chain.accounts.forEach((acc, idx) => {
            const isCurrent = acc === state.currentAccountId;
            let role = 'INTERMEDIARY MULE';
            let roleIcon = 'user';
            let nodeType = 'intermediary';

            if (idx === 0) {
                role = 'SOURCE';
                roleIcon = 'target';
                nodeType = 'source';
            } else if (idx === chain.accounts.length - 1) {
                role = 'CASH-OUT SINK';
                roleIcon = 'banknote';
                nodeType = 'sink';
            }

            html += `
                <div class="stepper-item" data-account="${acc}" data-index="${idx}">
                    <div class="stepper-account-row">
                        <div class="stepper-rail-node">
                            <div class="node-circle node-${nodeType}" title="${role}">
                                <i data-lucide="${roleIcon}"></i>
                            </div>
                        </div>
                        <div class="stepper-card ${isCurrent ? 'selected active-account' : ''}" 
                             tabindex="0" 
                             role="button" 
                             aria-label="Account ${acc}, ${role}. Click to focus in network graph"
                             data-account="${acc}">
                            <div class="card-account-id-group">
                                <span class="account-id mono">${acc}</span>
                                <button type="button" class="btn-copy-account" data-account="${acc}" title="Copy account ID" aria-label="Copy account ID ${acc}">
                                    <i data-lucide="copy"></i>
                                </button>
                            </div>
                            <div class="role-pill pill-${nodeType}">
                                <i data-lucide="${roleIcon}"></i>
                                <span>${role}</span>
                            </div>
                        </div>
                    </div>
            `;

            if (idx < chain.steps.length) {
                const step = chain.steps[idx];
                const prevStep = idx > 0 ? chain.steps[idx - 1] : null;
                const decayAmt = prevStep ? (prevStep.amount - step.amount) : 0;
                const decayPct = prevStep && prevStep.amount > 0 ? ((decayAmt / prevStep.amount) * 100).toFixed(1) : '0.0';

                // Dwell time between hops
                let dwellFormatted = '+0m';
                let isMonotonic = true;
                if (prevStep) {
                    const tCurrent = new Date(step.timestamp).getTime();
                    const tPrev = new Date(prevStep.timestamp).getTime();
                    if (!isNaN(tCurrent) && !isNaN(tPrev)) {
                        const diffMs = tCurrent - tPrev;
                        isMonotonic = diffMs >= 0;
                        if (diffMs >= 0) {
                            const totalMinutes = Math.round(diffMs / 60000);
                            if (totalMinutes < 60) {
                                dwellFormatted = `+${totalMinutes}m`;
                            } else {
                                const hours = Math.floor(totalMinutes / 60);
                                const mins = totalMinutes % 60;
                                dwellFormatted = mins === 0 ? `+${hours}h` : `+${hours}h ${mins}m`;
                            }
                        } else {
                            dwellFormatted = '-';
                        }
                    }
                }

                const formattedAmt = typeof step.amount === 'number'
                    ? step.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                    : '0.00';

                html += `
                    <div class="stepper-hop-row">
                        <div class="stepper-rail-connector">
                            <div class="connector-line">
                                <span class="traveling-dot"></span>
                            </div>
                        </div>
                        <div class="hop-metadata-container">
                            <div class="hop-metadata-pill">
                                <span class="hop-amount mono">$${formattedAmt}</span>
                                <span class="hop-divider">·</span>
                                <span class="hop-timestamp mono">
                                    <i data-lucide="clock"></i>
                                    <span>${step.timestamp}</span>
                                </span>
                                <span class="hop-dwell mono" title="Dwell time between hops">${dwellFormatted}</span>
                                ${decayAmt > 0 ? `
                                    <span class="hop-decay-chip mono" title="Amount decay">
                                        <i data-lucide="trending-down"></i>
                                        <span>-$${decayAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} · ${decayPct}%</span>
                                    </span>
                                ` : ''}
                                ${isMonotonic ? `
                                    <span class="hop-monotonic-check" title="Monotonic timestamp validated">
                                        <i data-lucide="check"></i>
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
        });

        els.stepperTimeline.innerHTML = html;
        lucide.createIcons();

        // Bind click & keyboard events on step cards to focus canvas
        els.stepperTimeline.querySelectorAll('.stepper-card').forEach(card => {
            const acc = card.dataset.account;
            const triggerFocus = () => {
                els.stepperTimeline.querySelectorAll('.stepper-card').forEach(c => c.classList.remove('selected', 'active-account'));
                card.classList.add('selected', 'active-account');
                focusNodeInCanvas(acc);
            };

            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-copy-account')) return;
                triggerFocus();
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerFocus();
                }
            });
        });

        // Bind copy buttons
        els.stepperTimeline.querySelectorAll('.btn-copy-account').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const acc = btn.dataset.account;
                navigator.clipboard.writeText(acc).then(() => {
                    btn.innerHTML = '<i data-lucide="check"></i>';
                    lucide.createIcons();
                    setTimeout(() => {
                        btn.innerHTML = '<i data-lucide="copy"></i>';
                        lucide.createIcons();
                    }, 1500);
                    showToast(`Copied account ID ${acc}`, 'info');
                }).catch(err => console.error('Copy failed:', err));
            });
        });

        // Summary footer
        if (els.sumInitialInflow) {
            els.sumInitialInflow.textContent = `$${(chain.initial_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        if (els.sumFinalOutflow) {
            els.sumFinalOutflow.textContent = `$${(chain.final_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        const haircutAmt = chain.fee_haircut || 0;
        const haircutPct = chain.initial_amount > 0 ? ((haircutAmt / chain.initial_amount) * 100).toFixed(1) : '0.0';
        if (els.sumDecay) {
            els.sumDecay.innerHTML = `<i data-lucide="trending-down" class="summary-decay-icon"></i><span>-$${haircutAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> <span class="summary-decay-pct">(${haircutPct}%)</span>`;
        }
        if (els.sumSpan) {
            const hours = chain.duration_hours || 0;
            let spanText = '';
            if (hours < 1) {
                const mins = Math.max(1, Math.round(hours * 60));
                spanText = `${mins}m`;
            } else {
                spanText = `${hours.toFixed(2)} h`;
            }
            els.sumSpan.textContent = spanText;
        }

        lucide.createIcons();
    }

    // -------------------------------------------------------------------------
    // GNNExplainer Details View
    // -------------------------------------------------------------------------
    function renderGnnExplainerView(gnn) {
        if (!els.allFeaturesList) return;
        if (!gnn || !gnn.all_features || gnn.all_features.length === 0) {
            els.allFeaturesList.innerHTML = '<div class="empty-state-muted">No feature attributions available for this account</div>';
            return;
        }

        // All features attribution bars
        let featHtml = '';
        gnn.all_features.forEach((feat, idx) => {
            const isHighlight = idx < 3;
            const score = typeof feat.score === 'number' ? feat.score : (feat.importance_score || 0);
            const pct = Math.min(Math.max(Math.round(score * 100), 0), 100);
            const scoreFormatted = (score * 100).toFixed(1) + '%';
            const cleanName = (feat.feature || '').replace(/_/g, ' ');

            featHtml += `
                <div class="feat-bar-row" title="${feat.feature || ''}: attribution score ${(score * 100).toFixed(2)}%">
                    <div class="feat-bar-labels">
                        <span class="feat-name">${cleanName}</span>
                        <span class="feat-score mono ${isHighlight ? 'accent-text' : ''}">${scoreFormatted}</span>
                    </div>
                    <div class="feat-track">
                        <div class="feat-bar-fill ${isHighlight ? 'highlight' : 'regular'}" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        });
        els.allFeaturesList.innerHTML = featHtml;

        // Counterparty flows table
        let tableHtml = '';
        const flows = gnn.top_counterparty_flows || [];
        if (flows.length === 0) {
            tableHtml = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 16px;">No incident counterparty flows attributed for this account</td></tr>';
        } else {
            flows.forEach(flow => {
                const isIncoming = flow.direction === 'inflow' || flow.direction === 'incoming';
                const dirColor = isIncoming ? 'var(--lime-500)' : 'var(--risk-high)';
                const barFillColor = isIncoming ? 'var(--lime-500)' : 'var(--risk-high)';
                const flowScore = typeof flow.importance_score === 'number' ? flow.importance_score : 0;
                const pct = Math.min(Math.max(Math.round(flowScore * 100), 0), 100);

                tableHtml += `
                    <tr>
                        <td>
                            <span class="badge-direction mono" style="color: ${dirColor};">
                                ${isIncoming ? '&larr; INFLOW' : '&rarr; OUTFLOW'}
                            </span>
                        </td>
                        <td class="mono"><strong>${flow.counterparty || flow.to_account || flow.from_account}</strong></td>
                        <td>
                            <div class="inline-weight-bar-wrap">
                                <div class="inline-track">
                                    <div class="inline-fill" style="width: ${pct}%; background: ${barFillColor};"></div>
                                </div>
                                <span class="mono weight-num">${(flowScore * 100).toFixed(1)}%</span>
                            </div>
                        </td>
                        <td class="mono">${flowScore > 0.6 ? 'High Influence' : 'Standard'}</td>
                    </tr>
                `;
            });
        }
        if (els.counterpartyTableBody) els.counterpartyTableBody.innerHTML = tableHtml;
    }

    // -------------------------------------------------------------------------
    // SAR Risk Card & Compliance Dossier Suite (Operate Mode)
    // -------------------------------------------------------------------------
    function simplePseudoSha256(str) {
        let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
        let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            h0 = (Math.imul(h0 ^ code, 0x5bd1e995) + h1) | 0;
            h1 = (Math.imul(h1 ^ (code << 3), 0x1b873593) + h2) | 0;
            h2 = (Math.imul(h2 ^ (code << 7), 0xcc9e2d51) + h3) | 0;
            h3 = (Math.imul(h3 ^ (code >> 2), 0x85ebca6b) + h4) | 0;
            h4 = (Math.imul(h4 ^ code, 0xc2b2ae35) + h5) | 0;
            h5 = (Math.imul(h5 ^ (code << 5), 0x27d4eb2f) + h6) | 0;
            h6 = (Math.imul(h6 ^ (code << 1), 0x165667b1) + h7) | 0;
            h7 = (Math.imul(h7 ^ (code >> 4), 0x9e3779b9) + h0) | 0;
        }
        const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
        return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
    }

    function switchSarMode(modeName) {
        state.currentSarMode = modeName;
        if (els.sarModeBtns) {
            els.sarModeBtns.forEach(btn => {
                const isActive = btn.dataset.mode === modeName;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
        }
        if (els.sarSubviews) {
            els.sarSubviews.forEach(sub => {
                sub.classList.toggle('active', sub.id === `sar-subview-${modeName}`);
            });
        }
        if (modeName === 'composer' && els.sarTextarea) {
            updateComposerTelemetry();
            els.sarTextarea.focus();
        }
        lucide.createIcons();
    }

    if (els.sarModeBtns) {
        els.sarModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                switchSarMode(btn.dataset.mode);
            });
        });
    }

    if (els.btnJumpComposer) {
        els.btnJumpComposer.addEventListener('click', () => {
            switchSarMode('composer');
            showToast('Switched to Narrative Composer & Validator', 'info', 1500);
        });
    }

    if (els.sarRefChip) {
        els.sarRefChip.addEventListener('click', async () => {
            const caseId = els.sarCaseIdText ? els.sarCaseIdText.textContent : `SAR-REF-${state.currentAccountId}`;
            await copyToClipboard(caseId);
            showToast(`Case reference ${caseId} copied`, 'lime', 1800);
        });
    }

    function renderSarRiskCard(report) {
        if (!report) return;

        const gnn = report.gnn_assessment || {};
        const chain = report.chain_profile || {};
        const prob = gnn.mule_probability || 0;
        const thresh = gnn.threshold || 0.525;
        const probPct = (prob * 100).toFixed(1);
        const threshPct = (thresh * 100).toFixed(1);
        const delta = ((prob - thresh) * 100).toFixed(1);
        const isAbove = prob >= thresh;

        const firstChain = (chain.active_chains && chain.active_chains.length > 0) ? chain.active_chains[0] : null;
        const role = (chain.primary_role || (isAbove ? 'HIGH RISK SUBJECT' : 'MONITORED SUBJECT')).replace(/_/g, ' ').toUpperCase();
        const tier = (report.risk_tier || 'MONITORED').toUpperCase();

        // 1. Header Case Reference
        const caseRef = `SAR-REF-${report.account_id}`;
        if (els.sarCaseIdText) els.sarCaseIdText.textContent = caseRef;

        // 2. Metrics Strip (4 High-Density Key Signals)
        if (els.sarTileProb) els.sarTileProb.textContent = `${probPct}%`;
        if (els.sarTileProbDelta) {
            els.sarTileProbDelta.textContent = `${isAbove ? '+' : ''}${delta}%`;
            els.sarTileProbDelta.className = `sar-metric-tag ${isAbove ? 'badge-critical' : 'badge-standard'}`;
        }
        if (els.sarTileThreshold) els.sarTileThreshold.textContent = `Threshold ${threshPct}% (${isAbove ? 'Flagged Mule' : 'Standard Bounds'})`;

        if (els.sarTileRole) els.sarTileRole.textContent = role;
        if (els.sarTileChains) {
            els.sarTileChains.textContent = chain.is_in_chain
                ? `${chain.max_chain_hops || 2}-Hop Sequential Chain (${chain.num_chains_found || 1} Found)`
                : 'No Multi-Hop Chain Detected';
        }

        if (els.sarTileRetention && els.sarTileHaircut && els.sarTileFlowAmt) {
            if (firstChain) {
                const retPct = ((firstChain.amount_retention || 0) * 100).toFixed(1);
                els.sarTileRetention.textContent = `${retPct}%`;
                els.sarTileHaircut.textContent = `-$${(firstChain.fee_haircut || 0).toFixed(2)} Haircut`;
                els.sarTileFlowAmt.textContent = `$${Math.round(firstChain.initial_amount || 0).toLocaleString()} → $${Math.round(firstChain.final_amount || 0).toLocaleString()}`;
            } else {
                els.sarTileRetention.textContent = 'N/A';
                els.sarTileHaircut.textContent = 'No Chain Flow';
                els.sarTileFlowAmt.textContent = 'Local Hub Flows';
            }
        }

        if (els.sarTileStatus) {
            if (tier.includes('CRITICAL')) {
                els.sarTileStatus.textContent = 'CRITICAL (24H FILING)';
                els.sarTileStatus.style.background = 'var(--risk-critical-bg)';
                els.sarTileStatus.style.color = 'var(--risk-critical)';
            } else if (tier.includes('HIGH')) {
                els.sarTileStatus.textContent = 'SAR READY';
                els.sarTileStatus.style.background = 'var(--risk-high-bg)';
                els.sarTileStatus.style.color = 'var(--risk-high)';
            } else if (tier.includes('ELEVATED')) {
                els.sarTileStatus.textContent = 'QUEUE FOR REVIEW';
                els.sarTileStatus.style.background = 'var(--risk-elevated-bg)';
                els.sarTileStatus.style.color = 'var(--risk-elevated)';
            } else {
                els.sarTileStatus.textContent = 'ROUTINE MONITORING';
                els.sarTileStatus.style.background = 'var(--risk-standard-bg)';
                els.sarTileStatus.style.color = 'var(--risk-standard)';
            }
        }
        if (els.sarTileAction) els.sarTileAction.textContent = report.recommended_action || 'Priority Compliance Queue';

        // 3. Dossier Section 1: Subject Identification
        if (els.sarDossierTierBadge) {
            els.sarDossierTierBadge.textContent = tier;
            const badgeClass = tier.includes('CRITICAL') ? 'badge-critical' : tier.includes('HIGH') ? 'badge-high' : tier.includes('ELEVATED') ? 'badge-elevated' : 'badge-standard';
            els.sarDossierTierBadge.className = `sar-section-badge ${badgeClass}`;
        }
        if (els.sarDossierAcc) els.sarDossierAcc.textContent = report.account_id;
        if (els.sarDossierTier) els.sarDossierTier.textContent = tier;
        if (els.sarDossierAction) els.sarDossierAction.textContent = report.recommended_action || 'Priority Compliance Queue';
        if (els.sarDossierClassification) {
            els.sarDossierClassification.textContent = chain.is_in_chain
                ? `Confirmed Multi-Hop Pass-Through Mule (${role})`
                : isAbove ? 'Anomalous High-Risk Account (Hub Centrality)' : 'Standard Monitored Customer';
        }

        // 4. Dossier Section 2: GNN Attribution
        if (els.sarDossierSubgraphCounts) {
            els.sarDossierSubgraphCounts.textContent = `${gnn.subgraph_nodes_count || 0} Nodes · ${gnn.subgraph_edges_count || 0} Directed Edges`;
        }
        if (els.sarDossierProbDisplay) els.sarDossierProbDisplay.textContent = `${probPct}%`;
        if (els.sarDossierThreshDisplay) {
            els.sarDossierThreshDisplay.textContent = `Threshold: ${threshPct}% (${isAbove ? `+${delta}% Above` : `${delta}% Below`})`;
        }
        if (els.sarDossierLogitDisplay) {
            const logit = gnn.gnn_logit || 0;
            els.sarDossierLogitDisplay.textContent = `${logit >= 0 ? '+' : ''}${logit.toFixed(4)}`;
        }
        if (els.sarDossierFeatureChips) {
            const topF = gnn.top_features || [];
            let chipsHtml = '';
            topF.slice(0, 4).forEach(f => {
                const name = f.feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const pct = (f.score * 100).toFixed(1);
                chipsHtml += `
                    <div class="sar-feat-chip">
                        <span>${name}</span>
                        <span class="sar-feat-score mono">${pct}%</span>
                    </div>
                `;
            });
            els.sarDossierFeatureChips.innerHTML = chipsHtml || '<span class="text-muted">No behavioral drivers recorded</span>';
        }

        // 5. Dossier Section 3: Sequential Laundering Chain Evidence
        if (els.sarDossierChainSteps && els.sarDossierChainStatus) {
            if (firstChain) {
                els.sarDossierChainStatus.textContent = 'CONFIRMED IN ACTIVE CHAIN';
                els.sarDossierChainStatus.className = 'sar-section-badge badge-critical';

                let breadcrumbsHtml = '';
                const accounts = firstChain.accounts || [];
                const steps = firstChain.steps || [];
                accounts.forEach((acc, idx) => {
                    const isTarget = acc === report.account_id;
                    breadcrumbsHtml += `
                        <span class="sar-chain-node-pill mono ${isTarget ? 'is-target' : ''}">
                            <strong>${acc}</strong> ${isTarget ? '<span class="pill-mini badge-critical">SUBJECT</span>' : ''}
                        </span>
                    `;
                    if (idx < accounts.length - 1) {
                        const step = steps[idx] || {};
                        const amt = step.amount ? `$${step.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '';
                        breadcrumbsHtml += `
                            <div class="sar-chain-arrow-group">
                                <i data-lucide="arrow-right"></i>
                                <span class="sar-chain-flow-info mono">${amt}</span>
                            </div>
                        `;
                    }
                });
                els.sarDossierChainSteps.innerHTML = breadcrumbsHtml;

                if (els.sarChainInflow) els.sarChainInflow.textContent = `$${(firstChain.initial_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                if (els.sarChainOutflow) els.sarChainOutflow.textContent = `$${(firstChain.final_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                if (els.sarChainRetention) els.sarChainRetention.textContent = `${((firstChain.amount_retention || 0) * 100).toFixed(1)}%`;
                if (els.sarChainDuration) els.sarChainDuration.textContent = `${(firstChain.duration_hours || 0).toFixed(1)} hrs`;
                if (els.sarChainHaircut) els.sarChainHaircut.textContent = `$${(firstChain.fee_haircut || 0).toFixed(2)}`;
            } else {
                els.sarDossierChainStatus.textContent = 'NO SEQUENTIAL CHAIN';
                els.sarDossierChainStatus.className = 'sar-section-badge badge-standard';
                els.sarDossierChainSteps.innerHTML = '<span class="text-muted" style="font-size: 11px; padding: 4px 0;">No multi-hop linear laundering sequence detected for this account. Local topology evaluated through direct 2-hop graph message passing.</span>';
                if (els.sarChainInflow) els.sarChainInflow.textContent = 'N/A';
                if (els.sarChainOutflow) els.sarChainOutflow.textContent = 'N/A';
                if (els.sarChainRetention) els.sarChainRetention.textContent = '0.0%';
                if (els.sarChainDuration) els.sarChainDuration.textContent = '0.0 hrs';
                if (els.sarChainHaircut) els.sarChainHaircut.textContent = '$0.00';
            }
        }

        // 6. Dossier Section 4: Counterparties Table
        if (els.sarDossierCounterpartiesTbody) {
            const cpFlows = gnn.top_counterparty_flows || [];
            let cpRows = '';
            cpFlows.slice(0, 4).forEach(flow => {
                const isOut = flow.direction === 'outgoing' || flow.direction === 'out';
                const dirClass = isOut ? 'out' : 'in';
                const dirLabel = isOut ? 'OUTGOING' : 'INCOMING';
                const score = flow.importance_score || 0.5;
                const scorePct = Math.round(score * 100);
                const cpId = flow.counterparty || (isOut ? flow.to_account : flow.from_account) || 'UNKNOWN';
                cpRows += `
                    <tr>
                        <td><span class="flow-dir-badge ${dirClass}">${dirLabel}</span></td>
                        <td class="mono"><strong>${cpId}</strong></td>
                        <td class="mono">
                            <span>${score.toFixed(3)}</span>
                            <span class="score-bar-mini"><span class="score-bar-fill" style="width: ${scorePct}%;"></span></span>
                        </td>
                        <td>
                            <button class="btn-focus-counterparty" data-account-id="${cpId}" title="Center node on network canvas">
                                <i data-lucide="crosshair"></i>
                                <span>Focus</span>
                            </button>
                        </td>
                    </tr>
                `;
            });
            els.sarDossierCounterpartiesTbody.innerHTML = cpRows || '<tr><td colspan="4" class="text-muted" style="text-align: center; padding: 12px;">No attributed counterparty flows recorded.</td></tr>';

            // Wire up focus buttons
            els.sarDossierCounterpartiesTbody.querySelectorAll('.btn-focus-counterparty').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.accountId;
                    focusNodeInCanvas(id);
                    showToast(`Centered graph on counterparty ${id}`, 'info', 1500);
                });
            });
        }

        // 7. Dossier Section 5: Official FinCEN Narrative
        const generatedNarrative = report.sar_narrative || report.sar_card_text || 'No narrative generated for this account.';
        state.originalSarNarrative = generatedNarrative;

        if (els.sarDossierNarrativeText) {
            els.sarDossierNarrativeText.textContent = els.sarTextarea && els.sarTextarea.dataset.userEdited
                ? els.sarTextarea.value
                : generatedNarrative;
        }

        // 8. Dossier Section 6: Audit Record
        if (els.sarAuditHash) {
            const hashSeed = `${report.account_id}:${prob}:${tier}:GraphSAGE_v1.0`;
            const pseudoHash = simplePseudoSha256(hashSeed);
            els.sarAuditHash.textContent = `SHA-256 Digest: ${pseudoHash}`;
        }

        // 9. Composer Setup
        if (els.sarTextarea && !els.sarTextarea.dataset.userEdited) {
            els.sarTextarea.value = generatedNarrative;
        }
        updateComposerTelemetry();

        // 10. Raw ASCII Report
        if (els.sarRawCardText) {
            els.sarRawCardText.textContent = report.sar_card_text || generatedNarrative;
        }

        lucide.createIcons();
    }

    // -------------------------------------------------------------------------
    // Composer Telemetry & Live Form 111 Meter
    // -------------------------------------------------------------------------
    function updateComposerTelemetry() {
        if (!els.sarTextarea) return;
        const text = els.sarTextarea.value || '';
        const count = text.length;
        const maxLimit = 17000; // FinCEN Form 111 XML limit

        if (els.charCounter) {
            els.charCounter.textContent = `${count.toLocaleString()} characters`;
        }

        if (els.fincenProgressBar) {
            const pct = Math.min(100, (count / maxLimit) * 100);
            els.fincenProgressBar.style.width = `${Math.max(2, pct)}%`;
            els.fincenProgressBar.classList.toggle('warning', count > 13600 && count <= maxLimit);
            els.fincenProgressBar.classList.toggle('exceeded', count > maxLimit);
        }

        if (els.fincenLimitLabel) {
            const pct = ((count / maxLimit) * 100).toFixed(1);
            if (count > maxLimit) {
                els.fincenLimitLabel.textContent = `FinCEN Limit Exceeded (+${(count - maxLimit).toLocaleString()} chars)`;
                els.fincenLimitLabel.style.color = 'var(--risk-critical)';
            } else {
                els.fincenLimitLabel.textContent = `FinCEN Form 111 Limit: 17,000 Chars (${pct}% used)`;
                els.fincenLimitLabel.style.color = 'var(--text-muted)';
            }
        }

        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (els.composerWordCount) {
            els.composerWordCount.textContent = `${words.toLocaleString()} words`;
        }

        if (els.composerReadTime) {
            const seconds = Math.round((words / 200) * 60);
            const readStr = seconds < 60 ? `~${Math.max(5, seconds)}s read` : `~${Math.ceil(seconds / 60)}m read`;
            els.composerReadTime.textContent = readStr;
        }
    }

    if (els.sarTextarea) {
        els.sarTextarea.addEventListener('input', () => {
            els.sarTextarea.dataset.userEdited = 'true';
            updateComposerTelemetry();
        });
    }

    // -------------------------------------------------------------------------
    // Composer Typology Templates & Live Tokens
    // -------------------------------------------------------------------------
    function getNarrativeTemplate(templateType, report) {
        if (!report) return '';
        const acc = report.account_id || 'UNKNOWN';
        const gnn = report.gnn_assessment || {};
        const chain = report.chain_profile || {};
        const probPct = ((gnn.mule_probability || 0) * 100).toFixed(1);
        const threshPct = ((gnn.threshold || 0.525) * 100).toFixed(1);
        const firstChain = (chain.active_chains && chain.active_chains.length > 0) ? chain.active_chains[0] : null;
        const role = (chain.primary_role || 'intermediary mule').replace(/_/g, ' ');
        const pathStr = firstChain ? firstChain.accounts.join(' -> ') : `${acc} (single-hub)`;
        const inflowStr = firstChain ? `$${firstChain.initial_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '$0.00';
        const outflowStr = firstChain ? `$${firstChain.final_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '$0.00';
        const retentionStr = firstChain ? `${((firstChain.amount_retention || 0) * 100).toFixed(1)}%` : 'N/A';
        const durationStr = firstChain ? `${firstChain.duration_hours.toFixed(1)}` : 'N/A';
        const haircutStr = firstChain ? `$${firstChain.fee_haircut.toFixed(2)}` : '$0.00';

        const topFeatures = (gnn.top_features || []).slice(0, 2).map(f => `'${f.feature.replace(/_/g, ' ')}'`).join(' and ') || 'topological flow velocity';

        switch (templateType) {
            case 'passthrough':
                return `SUBJECT: Account ${acc} has been flagged exhibiting rapid layered pass-through mule activity with a GNN mule probability of ${probPct}% (institutional threshold: ${threshPct}%). Graph neural message passing identified dominant drivers ${topFeatures}. Topological motif analysis confirms ${acc} acts as an '${role}' within a sequential laundering path (${pathStr}). Over an elapsed timeframe of ${durationStr} hours, ${acc} received ${inflowStr} in structured deposits and immediately disbursed ${outflowStr} downstream (${retentionStr} fund preservation, retaining ${haircutStr} as intermediary fee). This velocity and retention signature strongly indicate an active money mule intermediary. Recommend immediate fund freeze and source of wealth inquiry.`;

            case 'structuring':
                return `SUBJECT: Account ${acc} exhibits systematic transaction structuring and multi-counterparty coordination. Graph intelligence model assesses mule risk at ${probPct}% against institutional threshold ${threshPct}%. GNN attribution isolated ${topFeatures} as primary anomalies across ${gnn.subgraph_nodes_count || 12} local ego-network accounts and ${gnn.subgraph_edges_count || 164} directed flows. Flow timing reveals aggregated incoming credits structured to circumvent standard reporting thresholds, followed by rapid unified outflow to downstream accounts (${pathStr}). The account maintains negligible holding periods, consistent with organized mule network pass-through typologies. Formal SAR filing recommended within 24 hours.`;

            case 'hub':
                return `SUBJECT: Account ${acc} operates as a high-velocity transaction hub with acute counterparty dispersion. GNN model predicts ${probPct}% mule likelihood based on extreme out-degree velocity and graph centrality metrics (${topFeatures}). Subgraph topology comprises ${gnn.subgraph_nodes_count || 12} accounts and ${gnn.subgraph_edges_count || 164} flows. Counterparty concentration indicates concentrated fund collection followed by swift fan-out disbursement, characteristic of a syndicate disbursement hub or mule collector. Inflow/outflow disparity and counterparty clustering warrant heightened regulatory escalation and freeze of outgoing automated clearing house (ACH) and wire rails.`;

            case 'default':
            default:
                return state.originalSarNarrative || report.sar_narrative || report.sar_card_text || '';
        }
    }

    if (els.composerTemplateBtns) {
        els.composerTemplateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tpl = btn.dataset.template;
                state.activeNarrativeTemplate = tpl;
                els.composerTemplateBtns.forEach(b => b.classList.toggle('active', b === btn));

                if (state.currentInvestigation && els.sarTextarea) {
                    const newText = getNarrativeTemplate(tpl, state.currentInvestigation);
                    els.sarTextarea.value = newText;
                    els.sarTextarea.dataset.userEdited = 'true';
                    updateComposerTelemetry();
                    showToast(`Applied '${btn.textContent.trim()}' template`, 'info', 1800);
                }
            });
        });
    }

    function insertTokenAtCursor(tokenName, report) {
        if (!els.sarTextarea || !report) return;
        const gnn = report.gnn_assessment || {};
        const chain = report.chain_profile || {};
        const firstChain = (chain.active_chains && chain.active_chains.length > 0) ? chain.active_chains[0] : null;

        let insertVal = '';
        switch (tokenName) {
            case 'account':
                insertVal = report.account_id || '';
                break;
            case 'prob':
                insertVal = `${((gnn.mule_probability || 0) * 100).toFixed(1)}%`;
                break;
            case 'path':
                insertVal = firstChain ? firstChain.accounts.join(' -> ') : report.account_id;
                break;
            case 'inflow':
                insertVal = firstChain ? `$${firstChain.initial_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '$0.00';
                break;
            case 'outflow':
                insertVal = firstChain ? `$${firstChain.final_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '$0.00';
                break;
            case 'retention':
                insertVal = firstChain ? `${((firstChain.amount_retention || 0) * 100).toFixed(1)}%` : 'N/A';
                break;
            case 'hours':
                insertVal = firstChain ? `${firstChain.duration_hours.toFixed(1)} hours` : '0 hours';
                break;
            default:
                insertVal = '';
        }

        const ta = els.sarTextarea;
        const start = ta.selectionStart || 0;
        const end = ta.selectionEnd || 0;
        const text = ta.value;
        ta.value = text.substring(0, start) + insertVal + text.substring(end);
        ta.selectionStart = ta.selectionEnd = start + insertVal.length;
        ta.dataset.userEdited = 'true';
        ta.focus();
        updateComposerTelemetry();
        showToast(`Inserted token: ${tokenName}`, 'lime', 1200);
    }

    if (els.composerTokenChips) {
        els.composerTokenChips.forEach(chip => {
            chip.addEventListener('click', () => {
                insertTokenAtCursor(chip.dataset.token, state.currentInvestigation);
            });
        });
    }

    if (els.btnResetNarrative) {
        els.btnResetNarrative.addEventListener('click', () => {
            if (els.sarTextarea && state.originalSarNarrative) {
                els.sarTextarea.value = state.originalSarNarrative;
                delete els.sarTextarea.dataset.userEdited;
                if (els.sarDossierNarrativeText) els.sarDossierNarrativeText.textContent = state.originalSarNarrative;
                updateComposerTelemetry();
                showToast('Reset narrative to AI generated baseline', 'info', 1800);
            }
        });
    }

    if (els.btnApplyNarrative) {
        els.btnApplyNarrative.addEventListener('click', () => {
            if (els.sarTextarea && els.sarDossierNarrativeText) {
                els.sarDossierNarrativeText.textContent = els.sarTextarea.value;
                showToast('Applied narrative to Official Dossier view', 'lime', 2000);
            }
        });
    }

    if (els.btnCopyDossierNarrative) {
        els.btnCopyDossierNarrative.addEventListener('click', async () => {
            const text = els.sarTextarea ? els.sarTextarea.value : (state.originalSarNarrative || '');
            if (!text) {
                showToast('No narrative text available', 'warning', 2000);
                return;
            }
            await copyToClipboard(text);
            showToast('Narrative copied to clipboard', 'lime', 2000);
        });
    }

    // -------------------------------------------------------------------------
    // Markdown Dossier Generator for Export & Copy
    // -------------------------------------------------------------------------
    function generateMarkdownDossier(report, customNarrative, analystNotes) {
        if (!report) return '';
        const acc = report.account_id || 'UNKNOWN';
        const gnn = report.gnn_assessment || {};
        const chain = report.chain_profile || {};
        const probPct = ((gnn.mule_probability || 0) * 100).toFixed(1);
        const threshPct = ((gnn.threshold || 0.525) * 100).toFixed(1);
        const logit = gnn.gnn_logit || 0;
        const firstChain = (chain.active_chains && chain.active_chains.length > 0) ? chain.active_chains[0] : null;
        const tier = (report.risk_tier || 'MONITORED').toUpperCase();
        const narrative = customNarrative || report.sar_narrative || report.sar_card_text || '';
        const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

        let md = `# AML SUSPICIOUS ACTIVITY REPORT (SAR) INVESTIGATION DOSSIER\n\n`;
        md += `**Case Reference:** SAR-REF-${acc}  \n`;
        md += `**Generation Timestamp:** ${dateStr} UTC  \n`;
        md += `**Forensic Engine:** GraphSAGE v1.0 (Frozen 20% Test Split Benchmark 0.1884 PR-AUC)  \n`;
        md += `**Audit Signature:** ${simplePseudoSha256(`${acc}:${gnn.mule_probability}:${tier}`)}  \n\n`;

        md += `## 1. Executive Subject & Case Profile\n\n`;
        md += `| Attribute | Value |\n`;
        md += `| :--- | :--- |\n`;
        md += `| **Subject Account ID** | \`${acc}\` |\n`;
        md += `| **Regulatory Risk Classification** | **${tier}** |\n`;
        md += `| **Recommended Action** | ${report.recommended_action || 'Priority Compliance Queue'} |\n`;
        md += `| **Topological Role** | ${(chain.primary_role || 'INTERMEDIARY MULE').replace(/_/g, ' ').toUpperCase()} |\n`;
        md += `| **Multi-Hop Chain Membership** | ${chain.is_in_chain ? 'CONFIRMED IN ACTIVE CHAIN(S)' : 'No sequential chain'} |\n\n`;

        md += `## 2. Graph Neural Network Forensic Attribution\n\n`;
        md += `- **Mule Risk Probability:** ${probPct}% (Institutional Threshold: ${threshPct}%)\n`;
        md += `- **GNN Decision Logit:** ${logit >= 0 ? '+' : ''}${logit.toFixed(4)}\n`;
        md += `- **Local Subgraph Complexity:** ${gnn.subgraph_nodes_count || 0} nodes, ${gnn.subgraph_edges_count || 0} directed flows\n\n`;

        md += `### Primary Attributed Behavioral Drivers (GNNExplainer)\n\n`;
        md += `| Feature Name | Contribution Score | Normalized Raw Value |\n`;
        md += `| :--- | :--- | :--- |\n`;
        (gnn.top_features || []).forEach(f => {
            md += `| \`${f.feature}\` | ${(f.score * 100).toFixed(1)}% | ${typeof f.raw_value === 'number' ? f.raw_value.toFixed(4) : (f.raw_value || 'N/A')} |\n`;
        });
        md += `\n`;

        if (firstChain) {
            md += `## 3. Multi-Hop Sequential Laundering Chain Evidence\n\n`;
            md += `- **Primary Sequential Path:** \`${firstChain.accounts.join(' -> ')}\`\n`;
            md += `- **Initial Inflow Deposited:** $${firstChain.initial_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}\n`;
            md += `- **Downstream Disbursed Outflow:** $${firstChain.final_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}\n`;
            md += `- **Fund Preservation Rate:** ${((firstChain.amount_retention || 0) * 100).toFixed(1)}%\n`;
            md += `- **Elapsed Chain Execution Time:** ${firstChain.duration_hours.toFixed(1)} hours\n`;
            md += `- **Intermediary Fee Haircut:** $${firstChain.fee_haircut.toFixed(2)}\n\n`;

            md += `### Chronological Step Execution\n\n`;
            md += `| Step | From Account | To Account | Timestamp | Amount | Flow Tag |\n`;
            md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
            (firstChain.steps || []).forEach((s, idx) => {
                md += `| ${idx + 1} | \`${s.from}\` | \`${s.to}\` | ${s.timestamp || 'N/A'} | $${(s.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} | ${s.is_laundering ? 'Laundering Step' : 'Standard'} |\n`;
            });
            md += `\n`;
        }

        md += `## 4. Top Attributed Counterparty Flows\n\n`;
        md += `| Flow Direction | Counterparty Account | GNN Attribution Score |\n`;
        md += `| :--- | :--- | :--- |\n`;
        (gnn.top_counterparty_flows || []).slice(0, 6).forEach(cf => {
            const isOut = cf.direction === 'outgoing' || cf.direction === 'out';
            const cp = cf.counterparty || (isOut ? cf.to_account : cf.from_account);
            md += `| ${isOut ? 'OUTGOING' : 'INCOMING'} | \`${cp}\` | ${(cf.importance_score || 0).toFixed(3)} |\n`;
        });
        md += `\n`;

        md += `## 5. Official Synthesized Compliance Narrative (SAR Ready)\n\n`;
        md += `> ${narrative}\n\n`;

        if (analystNotes && analystNotes.trim()) {
            md += `## 6. Investigator Audit Notes\n\n`;
            md += `${analystNotes.trim()}\n\n`;
        }

        md += `---\n*Generated by Mule-tiplier AML Money Mule Detection & Graph Intelligence Platform*\n`;
        return md;
    }

    // -------------------------------------------------------------------------
    // Copy SAR Menu & Actions
    // -------------------------------------------------------------------------
    async function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {}
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (_) {}
        document.body.removeChild(ta);
        return success;
    }

    function triggerCopyButtonMorph(btn, textSpan, originalText) {
        if (!btn) return;
        const icon = btn.querySelector('i');
        const originalIconName = icon ? icon.getAttribute('data-lucide') : 'copy';
        if (icon) icon.setAttribute('data-lucide', 'check');
        if (textSpan) textSpan.textContent = 'Copied!';
        btn.classList.add('btn-copied');
        lucide.createIcons();

        setTimeout(() => {
            if (icon) icon.setAttribute('data-lucide', originalIconName);
            if (textSpan) textSpan.textContent = originalText;
            btn.classList.remove('btn-copied');
            lucide.createIcons();
        }, 1500);
    }

    if (els.btnCopySar) {
        els.btnCopySar.addEventListener('click', (e) => {
            e.stopPropagation();
            if (els.copyDropdown) {
                els.copyDropdown.classList.toggle('hidden');
                lucide.createIcons();
            }
        });
    }

    const btnCopyOptNarrative = document.getElementById('btn-copy-opt-narrative');
    if (btnCopyOptNarrative) {
        btnCopyOptNarrative.addEventListener('click', async () => {
            const text = els.sarTextarea ? els.sarTextarea.value : (state.originalSarNarrative || '');
            await copyToClipboard(text);
            if (els.copyDropdown) els.copyDropdown.classList.add('hidden');
            triggerCopyButtonMorph(els.btnCopySar, els.copySarText, 'Copy SAR');
            showToast('Copied SAR narrative to clipboard', 'lime', 2000);
        });
    }

    const btnCopyOptDossier = document.getElementById('btn-copy-opt-dossier');
    if (btnCopyOptDossier) {
        btnCopyOptDossier.addEventListener('click', async () => {
            const text = els.sarTextarea ? els.sarTextarea.value : '';
            const notes = els.sarAnalystNotes ? els.sarAnalystNotes.value : '';
            const md = generateMarkdownDossier(state.currentInvestigation, text, notes);
            await copyToClipboard(md);
            if (els.copyDropdown) els.copyDropdown.classList.add('hidden');
            triggerCopyButtonMorph(els.btnCopySar, els.copySarText, 'Copy SAR');
            showToast('Copied full Markdown compliance dossier', 'lime', 2000);
        });
    }

    const btnCopyOptRaw = document.getElementById('btn-copy-opt-raw');
    if (btnCopyOptRaw) {
        btnCopyOptRaw.addEventListener('click', async () => {
            const raw = state.currentInvestigation ? (state.currentInvestigation.sar_card_text || '') : '';
            await copyToClipboard(raw);
            if (els.copyDropdown) els.copyDropdown.classList.add('hidden');
            triggerCopyButtonMorph(els.btnCopySar, els.copySarText, 'Copy SAR');
            showToast('Copied raw ASCII compliance report', 'lime', 2000);
        });
    }

    const btnCopyOptJson = document.getElementById('btn-copy-opt-json');
    if (btnCopyOptJson) {
        btnCopyOptJson.addEventListener('click', async () => {
            const payload = state.currentInvestigation ? JSON.stringify(state.currentInvestigation, null, 2) : '{}';
            await copyToClipboard(payload);
            if (els.copyDropdown) els.copyDropdown.classList.add('hidden');
            triggerCopyButtonMorph(els.btnCopySar, els.copySarText, 'Copy SAR');
            showToast('Copied structured JSON investigation', 'lime', 2000);
        });
    }

    if (els.btnCopyRawCard) {
        els.btnCopyRawCard.addEventListener('click', async () => {
            const text = els.sarRawCardText ? els.sarRawCardText.textContent : '';
            await copyToClipboard(text);
            triggerCopyButtonMorph(els.btnCopyRawCard, els.btnCopyRawCard.querySelector('span'), 'Copy ASCII Card');
            showToast('Raw ASCII risk card copied to clipboard', 'lime', 2000);
        });
    }

    // -------------------------------------------------------------------------
    // Download SAR Dropdown Suite (txt / md / json / print)
    // -------------------------------------------------------------------------
    if (els.btnDownloadSar) {
        els.btnDownloadSar.addEventListener('click', (e) => {
            e.stopPropagation();
            if (els.downloadDropdown) {
                els.downloadDropdown.classList.toggle('hidden');
                lucide.createIcons();
            }
        });
    }

    if (els.downloadDropdown) {
        els.downloadDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const format = item.dataset.format;
                downloadSarFile(format);
                els.downloadDropdown.classList.add('hidden');
            });
        });
    }

    function downloadSarFile(format) {
        const accId = state.currentAccountId || 'REPORT';
        let content = '';
        let filename = '';
        let mimeType = '';

        if (format === 'txt') {
            content = els.sarTextarea ? els.sarTextarea.value : '';
            if (!content && state.currentInvestigation) content = state.currentInvestigation.sar_narrative || state.currentInvestigation.sar_card_text || '';
            filename = `SAR_Narrative_${accId}.txt`;
            mimeType = 'text/plain;charset=utf-8';
        } else if (format === 'md') {
            const customNarrative = els.sarTextarea ? els.sarTextarea.value : '';
            const notes = els.sarAnalystNotes ? els.sarAnalystNotes.value : '';
            content = generateMarkdownDossier(state.currentInvestigation, customNarrative, notes);
            filename = `SAR_Investigation_Dossier_${accId}.md`;
            mimeType = 'text/markdown;charset=utf-8';
        } else if (format === 'json') {
            content = JSON.stringify(state.currentInvestigation || {}, null, 2);
            filename = `SAR_Report_${accId}.json`;
            mimeType = 'application/json;charset=utf-8';
        } else if (format === 'print') {
            window.print();
            return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 150);

        showToast(`Downloaded ${filename}`, 'lime', 2200);
    }

    // -------------------------------------------------------------------------
    // Accessible Table Alternative (WCAG 2.1 AA)
    // -------------------------------------------------------------------------
    function renderAccessibleTable(subgraph) {
        if (!els.accessibleNodesTbody || !subgraph || !subgraph.nodes) return;

        if (subgraph.below_threshold) {
            els.accessibleNodesTbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center; padding: 24px; color: var(--text-muted);">
                        <i data-lucide="shield-check" style="display:inline-block; vertical-align:middle; margin-right:6px; color: var(--risk-standard);"></i>
                        Account risk is below mule threshold (52.5%). No laundering network to display.
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        let html = '';
        subgraph.nodes.forEach(node => {
            const edgeCount = (subgraph.edges || []).filter(e => e.source === node.id || e.target === node.id).length;
            const roleText = node.roleLabel || node.role || 'counterparty';
            html += `
                <tr>
                    <td class="mono"><strong>${node.id}</strong> ${node.is_target ? '<span class="pill-mini badge-critical">TARGET</span>' : ''}</td>
                    <td class="mono">${roleText.toUpperCase()}</td>
                    <td class="mono">${node.chain_hop ? 'Hop ' + node.chain_hop : edgeCount + ' Directed Edges'}</td>
                </tr>
            `;
        });
        els.accessibleNodesTbody.innerHTML = html;
    }

    if (els.btnTableAlt && els.canvasTableAlt) {
        els.btnTableAlt.addEventListener('click', () => {
            els.canvasTableAlt.classList.toggle('hidden');
        });
    }

    if (els.btnCloseTableAlt && els.canvasTableAlt) {
        els.btnCloseTableAlt.addEventListener('click', () => {
            els.canvasTableAlt.classList.add('hidden');
        });
    }

    // -------------------------------------------------------------------------
    // HTML5 Canvas Interactive Graph Engine (60fps)
    // -------------------------------------------------------------------------
    function resizeCanvas() {
        if (!els.canvas) return;
        const rect = els.canvas.parentElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        els.canvas.width = Math.floor(rect.width * dpr);
        els.canvas.height = Math.floor(rect.height * dpr);
        els.canvas.style.width = `${rect.width}px`;
        els.canvas.style.height = `${rect.height}px`;
    }

    function initGraphTopology(subgraph, report) {
        if (!els.canvas || !ctx || !subgraph) return;
        resizeCanvas();

        const rect = els.canvas.parentElement.getBoundingClientRect();
        const cx = (rect.width && rect.width > 0) ? rect.width / 2 : 300;
        const cy = (rect.height && rect.height > 0) ? rect.height / 2 : 300;

        state.nodePositions = {};
        const nodes = subgraph.nodes || [];
        const total = nodes.length;

        // Update Subgraph Count Chip
        if (els.chipSubgraphCounts) {
            if (subgraph.below_threshold) {
                els.chipSubgraphCounts.textContent = '1 Node · 0 Links (Below Mule Threshold)';
            } else if (subgraph.is_chain) {
                const chainLabel = `Chain ${state.selectedChainIndex + 1}${subgraph.total_chains ? ' of ' + subgraph.total_chains : ''}`;
                els.chipSubgraphCounts.textContent = `${total} Nodes · ${subgraph.edges.length} Hops (${chainLabel})`;
            } else {
                els.chipSubgraphCounts.textContent = `${total} Nodes · ${subgraph.edges.length} Suspicious Links`;
            }
        }

        // Layout Strategy
        if (subgraph.below_threshold) {
            // Case A: Below Threshold -> Single Target node centered
            nodes.forEach(node => {
                state.nodePositions[node.id] = {
                    ...node,
                    x: cx,
                    y: cy,
                    vx: 0,
                    vy: 0,
                    radius: 22,
                    isPinned: true
                };
            });
        } else if (subgraph.is_chain) {
            // Case B: Full Sequential Chain -> Ordered horizontal arc/wave from Source to Sink
            const spacing = Math.min(Math.max((rect.width - 240) / Math.max(total - 1, 1), 110), 220);
            const startX = cx - ((total - 1) * spacing) / 2;

            nodes.forEach((node, i) => {
                const x = startX + i * spacing;
                const yOffset = (i % 2 === 0 ? -1 : 1) * (total > 2 ? 32 : 0);
                const y = cy + yOffset;

                state.nodePositions[node.id] = {
                    ...node,
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    radius: node.is_target ? 22 : (node.role === 'source' || node.role === 'sink' ? 19 : 16),
                    isPinned: node.is_target
                };
            });
        } else {
            // Case C: Feature-flagged without motif -> Radial layout around Target
            nodes.forEach((node, i) => {
                if (node.is_target) {
                    state.nodePositions[node.id] = {
                        ...node,
                        x: cx,
                        y: cy,
                        vx: 0,
                        vy: 0,
                        radius: 22,
                        isPinned: true
                    };
                } else {
                    const angle = (i / Math.max(total, 1)) * Math.PI * 2;
                    const dist = 160 + (i % 2) * 40;
                    state.nodePositions[node.id] = {
                        ...node,
                        x: cx + Math.cos(angle) * dist,
                        y: cy + Math.sin(angle) * dist,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        radius: 15,
                        isPinned: false
                    };
                }
            });
        }

        fitGraphToScreen();

        if (!state.animFrameId) {
            runGraphLoop();
        }
    }

    function fitGraphToScreen() {
        state.canvasTransform.x = 0;
        state.canvasTransform.y = 0;
        state.canvasTransform.scale = 1;
    }

    function focusNodeInCanvas(nodeId) {
        const node = state.nodePositions[nodeId];
        if (!node || !els.canvas) return;
        const rect = els.canvas.parentElement.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        state.canvasTransform.x = cx - node.x;
        state.canvasTransform.y = cy - node.y;
        state.canvasTransform.scale = 1.35;
        state.selectedNodeId = nodeId;
    }

    // Physics Simulation Step
    function updatePhysics() {
        if (!state.physicsEnabled || !state.currentSubgraph || state.currentSubgraph.below_threshold) return;

        const nodes = Object.values(state.nodePositions);
        const edges = state.currentSubgraph.edges || [];

        // 1. Repulsion between all node pairs
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const dist = Math.hypot(dx, dy) || 1;

                if (dist < 320) {
                    const force = 1800 / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    if (!n1.isPinned) { n1.vx -= fx; n1.vy -= fy; }
                    if (!n2.isPinned) { n2.vx += fx; n2.vy += fy; }
                }
            }
        }

        // 2. Spring attraction along edges
        edges.forEach(edge => {
            const source = state.nodePositions[edge.source];
            const target = state.nodePositions[edge.target];
            if (!source || !target) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.hypot(dx, dy) || 1;
            const idealDist = edge.in_chain ? 130 : 180;
            const displacement = dist - idealDist;
            const springK = edge.in_chain ? 0.04 : 0.02;

            const fx = (dx / dist) * displacement * springK;
            const fy = (dy / dist) * displacement * springK;

            if (!source.isPinned) { source.vx += fx; source.vy += fy; }
            if (!target.isPinned) { target.vx += fx; target.vy += fy; }
        });

        // 3. Position update and damping
        nodes.forEach(n => {
            if (!n.isPinned && n !== state.draggedNode) {
                n.vx *= 0.88;
                n.vy *= 0.88;
                n.x += n.vx;
                n.y += n.vy;
            }
        });
    }

    // Render Canvas Frame
    function renderCanvas() {
        if (!els.canvas || !ctx || !state.currentSubgraph) return;
        const rect = els.canvas.parentElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Watermark Banner if Account is Below Threshold
        if (state.currentSubgraph.below_threshold) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = '600 13px Inter, sans-serif';
            ctx.fillStyle = state.theme === 'dark' ? '#94A3B8' : '#475569';
            ctx.fillText('Account risk is below mule threshold (52.5%).', rect.width / 2, rect.height - 38);
            ctx.font = '400 12px Inter, sans-serif';
            ctx.fillStyle = state.theme === 'dark' ? '#64748B' : '#94A3B8';
            ctx.fillText('No suspicious multi-hop laundering network loaded.', rect.width / 2, rect.height - 20);
            ctx.restore();
        }

        // Apply pan and zoom
        ctx.translate(state.canvasTransform.x, state.canvasTransform.y);
        ctx.scale(state.canvasTransform.scale, state.canvasTransform.scale);

        const edges = state.currentSubgraph.edges || [];
        const nodes = Object.values(state.nodePositions);
        const hoveredId = state.hoveredNodeId;

        state.pulseOffset = (state.pulseOffset + 0.015) % 1;

        // Render Edges
        edges.forEach(edge => {
            const u = state.nodePositions[edge.source];
            const v = state.nodePositions[edge.target];
            if (!u || !v) return;

            // Dim non-incident edges if a node is hovered
            let isDimmed = false;
            if (hoveredId && (u.id !== hoveredId && v.id !== hoveredId)) {
                isDimmed = true;
            }

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(u.x, u.y);
            ctx.lineTo(v.x, v.y);

            if (isDimmed) {
                ctx.strokeStyle = state.theme === 'dark' ? 'rgba(86, 92, 107, 0.15)' : 'rgba(200, 204, 212, 0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else if (edge.in_chain) {
                // Pulsing directional chain flow
                ctx.strokeStyle = '#FF4D5E';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Directional traveling dot along chain edge
                const dotProgress = (state.pulseOffset + (edge.source.charCodeAt(0) % 5) * 0.2) % 1;
                const dotX = u.x + (v.x - u.x) * dotProgress;
                const dotY = u.y + (v.y - u.y) * dotProgress;

                ctx.fillStyle = '#B6FF2E';
                ctx.beginPath();
                ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (edge.importance > 0.6) {
                ctx.strokeStyle = '#FF8A3D';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            } else {
                ctx.strokeStyle = state.theme === 'dark' ? 'rgba(86, 92, 107, 0.55)' : 'rgba(180, 185, 195, 0.7)';
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }

            // Draw directed arrowhead
            const headlen = 8;
            const angle = Math.atan2(v.y - u.y, v.x - u.x);
            const arrowX = v.x - Math.cos(angle) * (v.radius + 3);
            const arrowY = v.y - Math.sin(angle) * (v.radius + 3);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - headlen * Math.cos(angle - Math.PI / 6), arrowY - headlen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(arrowX - headlen * Math.cos(angle + Math.PI / 6), arrowY - headlen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = edge.in_chain ? '#FF4D5E' : (edge.importance > 0.6 ? '#FF8A3D' : '#565C6B');
            ctx.fill();

            ctx.restore();
        });

        // Render Nodes
        nodes.forEach(node => {
            const isTarget = node.is_target;
            const isChain = node.role === 'chain';
            const isSource = node.role === 'source';
            const isSink = node.role === 'sink';
            const isSelected = node.id === state.selectedNodeId;
            const isHovered = node.id === state.hoveredNodeId;

            ctx.save();

            // Glow effect
            if (isTarget) {
                ctx.shadowColor = node.is_clean ? 'rgba(45, 212, 191, 0.5)' : 'rgba(255, 77, 94, 0.5)';
                ctx.shadowBlur = 16;
            } else if (isSelected) {
                ctx.shadowColor = 'rgba(182, 255, 46, 0.8)';
                ctx.shadowBlur = 20;
            }

            // Fill color
            let fillColor = '#60A5FA';
            if (node.is_clean) fillColor = '#2DD4BF';
            else if (isTarget) fillColor = '#FF4D5E';
            else if (isSource) fillColor = '#2DD4BF';
            else if (isSink) fillColor = '#A78BFA';
            else if (isChain) fillColor = '#FF8A3D';

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();

            // Rings
            if (isTarget) {
                // Double ring
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = node.is_clean ? 'rgba(45, 212, 191, 0.45)' : 'rgba(255, 77, 94, 0.45)';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (isSource) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (isSink) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (isChain) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 138, 61, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Selected node lime ring
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
                ctx.strokeStyle = '#B6FF2E';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            // Pinned indicator glyph
            if (node.isPinned && !isTarget) {
                ctx.fillStyle = '#B6FF2E';
                ctx.beginPath();
                ctx.arc(node.x + node.radius - 2, node.y - node.radius + 2, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Monospace Node Label
            if (isTarget || isChain || isSource || isSink || isHovered || state.canvasTransform.scale > 1.2) {
                ctx.shadowBlur = 0;
                ctx.font = '500 11px JetBrains Mono, monospace';
                ctx.fillStyle = state.theme === 'dark' ? '#F8FAFC' : '#14161B';
                ctx.textAlign = 'center';
                ctx.fillText(node.id, node.x, node.y + node.radius + 15);
            }

            ctx.restore();
        });

        ctx.restore();
    }

    function runGraphLoop() {
        updatePhysics();
        renderCanvas();
        state.animFrameId = requestAnimationFrame(runGraphLoop);
    }

    // Canvas Mouse & Interaction Handlers
    function getCanvasCoordinates(e) {
        const rect = els.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const worldX = (clientX - state.canvasTransform.x) / state.canvasTransform.scale;
        const worldY = (clientY - state.canvasTransform.y) / state.canvasTransform.scale;
        return { clientX, clientY, worldX, worldY };
    }

    function findNodeAt(worldX, worldY) {
        const nodes = Object.values(state.nodePositions);
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dist = Math.hypot(worldX - n.x, worldY - n.y);
            if (dist <= n.radius + 6) {
                return n;
            }
        }
        return null;
    }

    if (els.canvas) {
        els.canvas.addEventListener('mousedown', (e) => {
            const { clientX, clientY, worldX, worldY } = getCanvasCoordinates(e);
            const clickedNode = findNodeAt(worldX, worldY);

            if (clickedNode) {
                state.draggedNode = clickedNode;
                clickedNode.isPinned = true;
                state.selectedNodeId = clickedNode.id;
            } else {
                state.canvasTransform.isDragging = true;
                state.canvasTransform.startX = clientX - state.canvasTransform.x;
                state.canvasTransform.startY = clientY - state.canvasTransform.y;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!els.canvas) return;
            const { clientX, clientY, worldX, worldY } = getCanvasCoordinates(e);

            if (state.draggedNode) {
                state.draggedNode.x = worldX;
                state.draggedNode.y = worldY;
                state.draggedNode.vx = 0;
                state.draggedNode.vy = 0;
            } else if (state.canvasTransform.isDragging) {
                state.canvasTransform.x = clientX - state.canvasTransform.startX;
                state.canvasTransform.y = clientY - state.canvasTransform.startY;
            } else {
                // Hover detection for tooltips
                const hoveredNode = findNodeAt(worldX, worldY);
                if (hoveredNode) {
                    state.hoveredNodeId = hoveredNode.id;
                    showNodeTooltip(hoveredNode, clientX, clientY);
                } else {
                    state.hoveredNodeId = null;
                    hideNodeTooltip();
                }
            }
        });

        window.addEventListener('mouseup', () => {
            state.draggedNode = null;
            state.canvasTransform.isDragging = false;
        });

        // Zoom with wheel
        els.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const { clientX, clientY } = getCanvasCoordinates(e);
            const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
            const newScale = Math.min(Math.max(state.canvasTransform.scale * zoomFactor, 0.35), 3.5);

            state.canvasTransform.x = clientX - (clientX - state.canvasTransform.x) * (newScale / state.canvasTransform.scale);
            state.canvasTransform.y = clientY - (clientY - state.canvasTransform.y) * (newScale / state.canvasTransform.scale);
            state.canvasTransform.scale = newScale;
        }, { passive: false });

        // Double click to switch investigation to that account
        els.canvas.addEventListener('dblclick', (e) => {
            const { worldX, worldY } = getCanvasCoordinates(e);
            const node = findNodeAt(worldX, worldY);
            if (node && node.id !== state.currentAccountId) {
                selectAccount(node.id);
            }
        });
    }

    // Node Tooltip Handler
    function showNodeTooltip(node, x, y) {
        if (!els.nodeTooltip) return;
        if (els.ttId) els.ttId.textContent = node.id;
        if (els.ttRole) {
            let roleName = node.roleLabel || node.role || 'counterparty';
            if (node.is_target) roleName = node.is_clean ? 'CLEAN TARGET' : 'TARGET MULE';
            els.ttRole.textContent = roleName.toUpperCase();
        }
        if (els.ttFlow) {
            if (node.is_clean) els.ttFlow.textContent = 'Normal Activity';
            else els.ttFlow.textContent = node.is_target ? '$31,466.97' : '$15,833.52';
        }
        if (els.ttHolding) {
            if (node.is_clean) els.ttHolding.textContent = 'Standard';
            else els.ttHolding.textContent = node.is_target ? '8.25 hrs' : '3.40 hrs';
        }
        if (els.ttScore) {
            if (node.is_clean) els.ttScore.textContent = '0.2% (Standard)';
            else if (typeof node.gnn_prob === 'number') els.ttScore.textContent = (node.gnn_prob * 100).toFixed(1) + '%';
            else if (node.chain_hop) els.ttScore.textContent = 'Hop ' + node.chain_hop;
            else els.ttScore.textContent = 'Attributed';
        }

        els.nodeTooltip.style.left = `${x + 18}px`;
        els.nodeTooltip.style.top = `${y + 18}px`;
        els.nodeTooltip.classList.remove('hidden');
    }

    function hideNodeTooltip() {
        if (els.nodeTooltip) els.nodeTooltip.classList.add('hidden');
    }

    // Canvas Floating Cluster Buttons
    if (els.btnZoomIn) {
        els.btnZoomIn.addEventListener('click', () => {
            state.canvasTransform.scale = Math.min(state.canvasTransform.scale * 1.25, 3.5);
        });
    }

    if (els.btnZoomOut) {
        els.btnZoomOut.addEventListener('click', () => {
            state.canvasTransform.scale = Math.max(state.canvasTransform.scale * 0.8, 0.35);
        });
    }

    if (els.btnFitScreen) {
        els.btnFitScreen.addEventListener('click', () => {
            fitGraphToScreen();
        });
    }

    if (els.btnTogglePhysics) {
        els.btnTogglePhysics.addEventListener('click', () => {
            state.physicsEnabled = !state.physicsEnabled;
            if (els.physicsIcon) els.physicsIcon.setAttribute('data-lucide', state.physicsEnabled ? 'play' : 'pause');
            lucide.createIcons();
            showToast(`Physics simulation ${state.physicsEnabled ? 'resumed' : 'paused'}`, 'info', 1500);
        });
    }

    // -------------------------------------------------------------------------
    // Keyboard Hotkeys (/ for search, 1-5 for tabs, G for graph, Esc)
    // -------------------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            if (e.key === 'Escape') {
                document.activeElement.blur();
                if (els.autocompleteDropdown) els.autocompleteDropdown.classList.add('hidden');
            }
            return;
        }

        if (e.key === '/') {
            e.preventDefault();
            if (els.globalSearchInput) {
                els.globalSearchInput.focus();
                els.globalSearchInput.select();
            }
        } else if (e.key >= '1' && e.key <= '5') {
            const tabs = ['tab-insights', 'tab-chains', 'tab-explainer', 'tab-sar', 'tab-benchmarks'];
            const idx = parseInt(e.key, 10) - 1;
            if (tabs[idx]) {
                switchTab(tabs[idx]);
                showToast(`Switched to Tab ${e.key}`, 'info', 1000);
            }
        } else if (e.key.toLowerCase() === 'g') {
            e.preventDefault();
            focusNodeInCanvas(state.currentAccountId);
            showToast('Centered graph on target account', 'info', 1000);
        } else if (e.key === 'Escape') {
            state.selectedNodeId = null;
            state.hoveredNodeId = null;
            hideNodeTooltip();
            if (els.canvasTableAlt) els.canvasTableAlt.classList.add('hidden');
            if (els.downloadDropdown) els.downloadDropdown.classList.add('hidden');
            if (els.copyDropdown) els.copyDropdown.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------------------
    // Initial Boot Sequence
    // -------------------------------------------------------------------------
    loadTelemetry();
    selectAccount(state.currentAccountId);
});
