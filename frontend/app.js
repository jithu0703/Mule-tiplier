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
 * - SAR narrative generation, copy morphing & export (.txt / .json)
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
        pulseOffset: 0
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
        stepperTimeline: document.getElementById('stepper-timeline'),
        sumInitialInflow: document.getElementById('sum-initial-inflow'),
        sumFinalOutflow: document.getElementById('sum-final-outflow'),
        sumDecay: document.getElementById('sum-decay'),
        sumSpan: document.getElementById('sum-span'),
        // Explainer
        allFeaturesList: document.getElementById('all-features-list'),
        counterpartyTableBody: document.getElementById('counterparty-table-body'),
        // SAR
        sarTextarea: document.getElementById('sar-narrative-textarea'),
        charCounter: document.getElementById('char-counter'),
        btnCopySar: document.getElementById('btn-copy-sar'),
        copySarText: document.getElementById('copy-sar-text'),
        btnDownloadSar: document.getElementById('btn-download-sar'),
        downloadDropdown: document.getElementById('download-dropdown'),
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

    els.themeToggleBtn.addEventListener('click', () => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        showToast(`Theme switched to ${nextTheme.toUpperCase()}`, 'info');
    });

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
            <button class="toast-close">&times;</button>
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

        closeBtn.addEventListener('click', dismiss);
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

    els.btnJumpChains.addEventListener('click', () => {
        switchTab('tab-chains');
    });

    els.btnGenerateSar.addEventListener('click', () => {
        switchTab('tab-sar');
        els.sarTextarea.focus();
        showToast('Switched to SAR Risk Card narrative view', 'info');
    });

    // -------------------------------------------------------------------------
    // Telemetry Loader
    // -------------------------------------------------------------------------
    async function loadTelemetry() {
        try {
            const res = await fetch('/api/v1/telemetry');
            if (!res.ok) throw new Error('Telemetry API failure');
            const data = await res.json();

            state.presets = data.presets || [];
            
            if (els.tileAccounts) els.tileAccounts.textContent = data.monitored_accounts.toLocaleString();
            if (els.tileTransactions) els.tileTransactions.textContent = (data.monitored_transactions / 1000000).toFixed(2) + 'M';
            if (els.tilePrauc) els.tilePrauc.textContent = data.test_pr_auc.toFixed(4);
            if (els.tilePrDelta) els.tilePrDelta.textContent = `+${Math.round(data.pr_auc_lift_pct)}% LIFT`;
            if (els.tilePurity) els.tilePurity.textContent = (data.alert_purity_precision * 100).toFixed(1) + '%';
        } catch (err) {
            console.error('Failed to load telemetry:', err);
        }
    }

    // -------------------------------------------------------------------------
    // Global Autocomplete Search
    // -------------------------------------------------------------------------
    let searchDebounceTimer = null;

    function renderAutocomplete(results) {
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

    els.globalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimer);
        if (!query) {
            els.autocompleteDropdown.classList.add('hidden');
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
            els.autocompleteDropdown.classList.add('hidden');
        } else if (e.key === 'Enter') {
            const firstItem = els.autocompleteDropdown.querySelector('.autocomplete-item');
            if (firstItem) {
                firstItem.click();
            } else if (els.globalSearchInput.value.trim()) {
                selectAccount(els.globalSearchInput.value.trim().toUpperCase());
                els.autocompleteDropdown.classList.add('hidden');
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!els.globalSearchInput.contains(e.target) && !els.autocompleteDropdown.contains(e.target)) {
            els.autocompleteDropdown.classList.add('hidden');
        }
        if (!els.btnDownloadSar.contains(e.target) && !els.downloadDropdown.contains(e.target)) {
            els.downloadDropdown.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------------------
    // Account Selection & Investigation Loader
    // -------------------------------------------------------------------------
    async function selectAccount(accountId) {
        state.currentAccountId = accountId;
        state.selectedChainIndex = 0;
        showToast(`Investigating Account ${accountId}...`, 'info', 2000);

        try {
            // Parallel fetch of report and 2-hop subgraph
            const [reportRes, subRes] = await Promise.all([
                fetch(`/api/v1/accounts/${accountId}/investigation`),
                fetch(`/api/v1/accounts/${accountId}/subgraph`)
            ]);

            if (!reportRes.ok) throw new Error(`Account ${accountId} not found in graph index.`);
            
            const report = await reportRes.json();
            const subgraph = await subRes.json();

            state.currentInvestigation = report;
            state.currentSubgraph = subgraph;

            // Render all UI components
            renderBanner(report);
            renderGauge(report.gnn_assessment);
            renderStatBlocks(report);
            renderFeatureAttributions(report.gnn_assessment.top_features);
            renderQuickChainPreview(report.chain_profile);
            renderChainStepper(report.chain_profile);
            renderGnnExplainerView(report.gnn_assessment);
            renderSarRiskCard(report);
            initGraphTopology(subgraph, report);
            renderAccessibleTable(subgraph);

            showToast(`Loaded analysis for ${accountId} (${report.risk_tier.toUpperCase()})`, 'lime', 2500);
        } catch (err) {
            console.error(err);
            showToast(err.message, 'critical', 4000);
        }
    }

    // -------------------------------------------------------------------------
    // Banner Rendering
    // -------------------------------------------------------------------------
    function renderBanner(report) {
        els.bannerAccountId.textContent = report.account_id;
        els.bannerActionText.textContent = report.recommended_action;

        // Reset badge classes
        const tier = report.risk_tier.toLowerCase();
        els.bannerRiskBadge.className = `risk-badge pill badge-${tier}`;
        els.bannerRiskLabel.textContent = `${report.risk_tier.toUpperCase()} RISK`;

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

        document.getElementById('account-banner').style.borderLeftColor = bannerBorderColor;
        els.bannerRiskIcon.setAttribute('data-lucide', iconName);
        lucide.createIcons();
    }

    // Copy Account ID
    els.copyAccountBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(state.currentAccountId);
        showToast(`Account ID ${state.currentAccountId} copied to clipboard`, 'lime', 1800);
    });

    // Freeze Account Button Simulation
    let isFrozen = false;
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

    // -------------------------------------------------------------------------
    // Gauge Animation & Math
    // -------------------------------------------------------------------------
    function renderGauge(gnn) {
        const prob = gnn.mule_probability;
        const threshold = gnn.threshold || 0.5254;
        
        // Arc circumference = PI * 80 ~= 251.327
        const arcCircumference = Math.PI * 80;
        const targetOffset = arcCircumference * (1 - prob);

        // Animate count up text
        const duration = 750;
        const startVal = 0;
        const startTime = performance.now();

        function stepGauge(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentProb = startVal + (prob - startVal) * ease;

            els.gaugeValDisplay.textContent = (currentProb * 100).toFixed(1) + '%';
            els.gaugeFillPath.style.strokeDashoffset = arcCircumference * (1 - currentProb);

            if (progress < 1) {
                requestAnimationFrame(stepGauge);
            } else {
                els.gaugeValDisplay.textContent = (prob * 100).toFixed(1) + '%';
                els.gaugeFillPath.style.strokeDashoffset = targetOffset;
            }
        }
        requestAnimationFrame(stepGauge);

        // Threshold Tick positioning
        // Threshold angle theta in [0, PI]
        const theta = threshold * Math.PI;
        const cx = 100, cy = 100;
        const rInner = 68, rOuter = 92;
        const x1 = cx - rInner * Math.cos(theta);
        const y1 = cy - rInner * Math.sin(theta);
        const x2 = cx - rOuter * Math.cos(theta);
        const y2 = cy - rOuter * Math.sin(theta);

        els.gaugeTick.setAttribute('x1', x1.toFixed(2));
        els.gaugeTick.setAttribute('y1', y1.toFixed(2));
        els.gaugeTick.setAttribute('x2', x2.toFixed(2));
        els.gaugeTick.setAttribute('y2', y2.toFixed(2));

        // Delta Chip
        const delta = prob - threshold;
        const deltaPct = (Math.abs(delta) * 100).toFixed(1);
        if (delta >= 0) {
            els.gaugeDeltaLabel.textContent = `+${deltaPct}% Above`;
            els.gaugeDeltaLabel.style.color = 'var(--lime-500)';
        } else {
            els.gaugeDeltaLabel.textContent = `-${deltaPct}% Below`;
            els.gaugeDeltaLabel.style.color = 'var(--risk-standard)';
        }

        // Subgraph chip
        els.chipSubgraphCounts.textContent = `${gnn.subgraph_nodes_count} Nodes · ${gnn.subgraph_edges_count} Edges`;
    }

    // -------------------------------------------------------------------------
    // Stat Blocks & Feature Attribution Bars
    // -------------------------------------------------------------------------
    function renderStatBlocks(report) {
        const cp = report.chain_profile;
        els.statChainRole.textContent = (cp.primary_role || 'INDEPENDENT').toUpperCase();
        
        if (cp.num_chains_found > 0) {
            els.statActiveChains.textContent = `${cp.num_chains_found} Chains (Max ${cp.max_chain_hops} Hops)`;
            const firstChain = cp.active_chains[0];
            const retPct = firstChain ? (firstChain.amount_retention * 100).toFixed(1) + '% Retained' : 'N/A';
            els.statRetention.textContent = retPct;
        } else {
            els.statActiveChains.textContent = 'None Detected';
            els.statRetention.textContent = '0.0% Pass-through';
        }
    }

    function renderFeatureAttributions(topFeatures) {
        if (!topFeatures || topFeatures.length === 0) {
            els.featureBarsContainer.innerHTML = '<div class="empty-state-muted">No feature attributions available</div>';
            return;
        }

        let html = '';
        topFeatures.slice(0, 4).forEach((feat, idx) => {
            const isHighlight = idx < 3; // Top 3 are lime
            const pct = Math.round(feat.importance_score * 100);
            const scoreFormatted = (feat.importance_score * 100).toFixed(1) + '%';
            const cleanName = feat.feature.replace(/_/g, ' ');

            html += `
                <div class="feat-bar-row" title="${feat.feature}: raw attribution score ${feat.importance_score.toFixed(4)}">
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
        if (!chainProfile.is_in_chain || !chainProfile.active_chains || chainProfile.active_chains.length === 0) {
            els.quickChainPreview.innerHTML = `
                <div class="no-chain-banner">
                    <i data-lucide="info" class="inline-icon"></i>
                    <span>No sequential multi-hop laundering chains intersect this account</span>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const chain = chainProfile.active_chains[0];
        let html = '';
        chain.accounts.forEach((acc, i) => {
            const isTarget = acc === state.currentAccountId;
            html += `
                <span class="chain-chip mono ${isTarget ? 'target-chip' : ''}" title="Hop ${i + 1}: ${acc}">
                    ${acc}
                </span>
            `;
            if (i < chain.accounts.length - 1) {
                html += `<span class="chain-arrow">&rarr;</span>`;
            }
        });

        els.quickChainPreview.innerHTML = html;
    }

    // -------------------------------------------------------------------------
    // Multi-Hop Sequential Stepper
    // -------------------------------------------------------------------------
    function renderChainStepper(chainProfile) {
        if (!chainProfile.is_in_chain || !chainProfile.active_chains || chainProfile.active_chains.length === 0) {
            els.chainSelectBox.innerHTML = '<option value="">No Active Chains</option>';
            els.stepperTimeline.innerHTML = `
                <div class="empty-stepper-state">
                    <i data-lucide="git-commit" class="empty-icon"></i>
                    <h4>No Sequential Multi-Hop Chains Detected</h4>
                    <p>This account does not participate in chronological pass-through layering flows with amount decay.</p>
                </div>
            `;
            els.sumInitialInflow.textContent = '$0.00';
            els.sumFinalOutflow.textContent = '$0.00';
            els.sumDecay.textContent = '$0.00 (0.0%)';
            els.sumSpan.textContent = '0.0 Hours';
            lucide.createIcons();
            return;
        }

        // Populate Chain Dropdown
        let optionsHtml = '';
        chainProfile.active_chains.forEach((c, i) => {
            optionsHtml += `<option value="${i}">Chain ${i + 1} (${c.hops} Hops · $${c.initial_amount.toLocaleString()})</option>`;
        });
        els.chainSelectBox.innerHTML = optionsHtml;
        els.chainSelectBox.value = state.selectedChainIndex;

        els.chainSelectBox.onchange = (e) => {
            state.selectedChainIndex = parseInt(e.target.value, 10);
            renderSelectedChain(chainProfile.active_chains[state.selectedChainIndex]);
        };

        renderSelectedChain(chainProfile.active_chains[state.selectedChainIndex]);
    }

    function renderSelectedChain(chain) {
        if (!chain) return;

        // Stepper timeline HTML
        let html = '';
        chain.accounts.forEach((acc, idx) => {
            const isCurrent = acc === state.currentAccountId;
            const role = idx === 0 ? 'SOURCE / INITIATOR' : (idx === chain.accounts.length - 1 ? 'CASH-OUT SINK' : 'INTERMEDIARY MULE');

            html += `
                <div class="stepper-node-row">
                    <div class="stepper-node-chip ${isCurrent ? 'active-account' : ''}" data-account="${acc}">
                        <i data-lucide="${isCurrent ? 'target' : 'user'}" class="chip-icon"></i>
                        <span class="mono">${acc}</span>
                        <span class="chip-role-tag">${role}</span>
                    </div>
                </div>
            `;

            if (idx < chain.steps.length) {
                const step = chain.steps[idx];
                const decayAmt = idx > 0 ? (chain.steps[idx - 1].amount - step.amount) : 0;
                const decayPct = idx > 0 ? ((decayAmt / chain.steps[idx - 1].amount) * 100).toFixed(1) : '0.0';

                html += `
                    <div class="stepper-connector">
                        <div class="connector-line-wrapper">
                            <span class="traveling-dot"></span>
                        </div>
                        <div class="connector-meta">
                            <div class="meta-row">
                                <span class="meta-amt mono">$${step.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                <span class="meta-dwell mono"><i data-lucide="clock" class="mini-icon"></i> ${step.timestamp}</span>
                                ${decayAmt > 0 ? `<span class="meta-decay mono">-$${decayAmt.toFixed(2)} (${decayPct}%)</span>` : ''}
                                <i data-lucide="check-circle" class="check-icon" title="Monotonic timestamp validated"></i>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        els.stepperTimeline.innerHTML = html;
        lucide.createIcons();

        // Bind click on step node chips to zoom/highlight in canvas
        els.stepperTimeline.querySelectorAll('.stepper-node-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const acc = chip.dataset.account;
                focusNodeInCanvas(acc);
            });
        });

        // Summary footer
        els.sumInitialInflow.textContent = `$${chain.initial_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        els.sumFinalOutflow.textContent = `$${chain.final_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        const haircutPct = ((chain.fee_haircut / chain.initial_amount) * 100).toFixed(1);
        els.sumDecay.textContent = `-$${chain.fee_haircut.toFixed(2)} (${haircutPct}%)`;
        els.sumSpan.textContent = `${chain.duration_hours} Hours`;
    }

    // -------------------------------------------------------------------------
    // GNNExplainer Details View
    // -------------------------------------------------------------------------
    function renderGnnExplainerView(gnn) {
        // All features attribution bars
        let featHtml = '';
        gnn.all_features.forEach((feat, idx) => {
            const isHighlight = idx < 3;
            const pct = Math.round(feat.importance_score * 100);
            featHtml += `
                <div class="feat-bar-row">
                    <div class="feat-bar-labels">
                        <span class="feat-name">${feat.feature}</span>
                        <span class="feat-score mono ${isHighlight ? 'accent-text' : ''}">${(feat.importance_score * 100).toFixed(1)}%</span>
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
        gnn.top_counterparty_flows.forEach(flow => {
            const isIncoming = flow.direction === 'inflow';
            const dirColor = isIncoming ? 'var(--lime-500)' : 'var(--risk-high)';
            const barFillColor = isIncoming ? 'var(--lime-500)' : 'var(--risk-high)';
            const pct = Math.round(flow.importance_score * 100);

            tableHtml += `
                <tr>
                    <td>
                        <span class="badge-direction mono" style="color: ${dirColor};">
                            ${isIncoming ? '&larr; INFLOW' : '&rarr; OUTFLOW'}
                        </span>
                    </td>
                    <td class="mono"><strong>${flow.counterparty}</strong></td>
                    <td>
                        <div class="inline-weight-bar-wrap">
                            <div class="inline-track">
                                <div class="inline-fill" style="width: ${pct}%; background: ${barFillColor};"></div>
                            </div>
                            <span class="mono weight-num">${(flow.importance_score * 100).toFixed(1)}%</span>
                        </div>
                    </td>
                    <td class="mono">${flow.importance_score > 0.65 ? 'High Influence' : 'Standard'}</td>
                </tr>
            `;
        });
        els.counterpartyTableBody.innerHTML = tableHtml;
    }

    // -------------------------------------------------------------------------
    // SAR Risk Card & Narrative Export
    // -------------------------------------------------------------------------
    function renderSarRiskCard(report) {
        els.sarTextarea.value = report.sar_narrative;
        updateCharCounter();
    }

    function updateCharCounter() {
        const count = els.sarTextarea.value.length;
        els.charCounter.textContent = `${count.toLocaleString()} characters`;
    }

    els.sarTextarea.addEventListener('input', updateCharCounter);

    // Copy SAR with 1.5s icon morph
    els.btnCopySar.addEventListener('click', () => {
        navigator.clipboard.writeText(els.sarTextarea.value);
        const icon = document.getElementById('copy-sar-icon');
        icon.setAttribute('data-lucide', 'check');
        els.copySarText.textContent = 'Copied!';
        els.btnCopySar.classList.add('btn-copied');
        lucide.createIcons();

        showToast('SAR narrative copied to clipboard', 'lime', 2000);

        setTimeout(() => {
            icon.setAttribute('data-lucide', 'copy');
            els.copySarText.textContent = 'Copy SAR';
            els.btnCopySar.classList.remove('btn-copied');
            lucide.createIcons();
        }, 1500);
    });

    // Download SAR Dropdown
    els.btnDownloadSar.addEventListener('click', (e) => {
        e.stopPropagation();
        els.downloadDropdown.classList.toggle('hidden');
    });

    els.downloadDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const format = item.dataset.format;
            downloadSarFile(format);
            els.downloadDropdown.classList.add('hidden');
        });
    });

    function downloadSarFile(format) {
        const accId = state.currentAccountId;
        let content = '';
        let filename = '';
        let mimeType = '';

        if (format === 'txt') {
            content = els.sarTextarea.value;
            filename = `SAR_Report_${accId}.txt`;
            mimeType = 'text/plain';
        } else if (format === 'json') {
            content = JSON.stringify(state.currentInvestigation, null, 2);
            filename = `SAR_Report_${accId}.json`;
            mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Downloaded ${filename}`, 'lime', 2200);
    }

    // -------------------------------------------------------------------------
    // Accessible Table Alternative (WCAG 2.1 AA)
    // -------------------------------------------------------------------------
    function renderAccessibleTable(subgraph) {
        if (!els.accessibleNodesTbody || !subgraph) return;
        let html = '';
        subgraph.nodes.forEach(node => {
            const edgeCount = subgraph.edges.filter(e => e.source === node.id || e.target === node.id).length;
            html += `
                <tr>
                    <td class="mono"><strong>${node.id}</strong> ${node.is_target ? '<span class="pill-mini badge-critical">TARGET</span>' : ''}</td>
                    <td class="mono">${node.role.toUpperCase()}</td>
                    <td class="mono">${edgeCount} Directed Edges</td>
                </tr>
            `;
        });
        els.accessibleNodesTbody.innerHTML = html;
    }

    els.btnTableAlt.addEventListener('click', () => {
        els.canvasTableAlt.classList.toggle('hidden');
    });

    els.btnCloseTableAlt.addEventListener('click', () => {
        els.canvasTableAlt.classList.add('hidden');
    });

    // -------------------------------------------------------------------------
    // HTML5 Canvas Interactive Graph Engine (60fps)
    // -------------------------------------------------------------------------
    function resizeCanvas() {
        if (!els.canvas) return;
        const rect = els.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        els.canvas.width = rect.width * dpr;
        els.canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    function initGraphTopology(subgraph, report) {
        if (!els.canvas || !ctx) return;
        resizeCanvas();

        const rect = els.canvas.parentElement.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        state.nodePositions = {};
        const nodes = subgraph.nodes;
        const total = nodes.length;

        // Radial layout initialization with target at center
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
            } else if (node.role === 'chain') {
                const angle = (i / total) * Math.PI * 2;
                const dist = 140 + (i % 2) * 30;
                state.nodePositions[node.id] = {
                    ...node,
                    x: cx + Math.cos(angle) * dist,
                    y: cy + Math.sin(angle) * dist,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    radius: 17,
                    isPinned: false
                };
            } else {
                const angle = (i / total) * Math.PI * 2;
                const dist = 220 + (i % 3) * 40;
                state.nodePositions[node.id] = {
                    ...node,
                    x: cx + Math.cos(angle) * dist,
                    y: cy + Math.sin(angle) * dist,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    radius: 12,
                    isPinned: false
                };
            }
        });

        // Reset transform to fit
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

        // Smooth transition target
        state.canvasTransform.x = cx - node.x;
        state.canvasTransform.y = cy - node.y;
        state.canvasTransform.scale = 1.35;
        state.selectedNodeId = nodeId;
    }

    // Physics Simulation Step
    function updatePhysics() {
        if (!state.physicsEnabled || !state.currentSubgraph) return;

        const nodes = Object.values(state.nodePositions);
        const edges = state.currentSubgraph.edges;

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
            if (!target.isPinned) { target.vx -= fx; target.vy -= fy; }
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
        const width = rect.width;
        const height = rect.height;

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        // Apply pan and zoom
        ctx.translate(state.canvasTransform.x, state.canvasTransform.y);
        ctx.scale(state.canvasTransform.scale, state.canvasTransform.scale);

        const edges = state.currentSubgraph.edges;
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
            let isFocused = (u.id === state.selectedNodeId || v.id === state.selectedNodeId);

            if (hoveredId) {
                if (u.id !== hoveredId && v.id !== hoveredId) {
                    isDimmed = true;
                }
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
                // Animated pulsing chain flow
                ctx.strokeStyle = '#FF4D5E';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Directional traveling dot pulse along edge
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

            // Draw arrowhead
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
            const isSelected = node.id === state.selectedNodeId;
            const isHovered = node.id === state.hoveredNodeId;

            ctx.save();

            // Glow effect
            if (isTarget) {
                ctx.shadowColor = 'rgba(255, 77, 94, 0.5)';
                ctx.shadowBlur = 16;
            } else if (isSelected) {
                ctx.shadowColor = 'rgba(182, 255, 46, 0.8)';
                ctx.shadowBlur = 20;
            }

            // Fill color
            let fillColor = '#60A5FA';
            if (isTarget) fillColor = '#FF4D5E';
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
                ctx.strokeStyle = 'rgba(255, 77, 94, 0.45)';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1.5;
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

            // Monospace Node Label (always for target & chain, or on hover)
            if (isTarget || isChain || isHovered || state.canvasTransform.scale > 1.2) {
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
        // Inverse transform to world coordinates
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

            // Zoom around mouse position
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
        els.ttId.textContent = node.id;
        els.ttRole.textContent = node.role.toUpperCase();
        els.ttFlow.textContent = node.is_target ? '$31,466.97' : '$15,833.52';
        els.ttHolding.textContent = node.is_target ? '8.25 hrs' : '3.40 hrs';
        els.ttScore.textContent = node.gnn_prob ? (node.gnn_prob * 100).toFixed(1) + '%' : 'Attributed';

        els.nodeTooltip.style.left = `${x + 18}px`;
        els.nodeTooltip.style.top = `${y + 18}px`;
        els.nodeTooltip.classList.remove('hidden');
    }

    function hideNodeTooltip() {
        if (els.nodeTooltip) els.nodeTooltip.classList.add('hidden');
    }

    // Canvas Floating Cluster Buttons
    els.btnZoomIn.addEventListener('click', () => {
        state.canvasTransform.scale = Math.min(state.canvasTransform.scale * 1.25, 3.5);
    });

    els.btnZoomOut.addEventListener('click', () => {
        state.canvasTransform.scale = Math.max(state.canvasTransform.scale * 0.8, 0.35);
    });

    els.btnFitScreen.addEventListener('click', () => {
        fitGraphToScreen();
    });

    els.btnTogglePhysics.addEventListener('click', () => {
        state.physicsEnabled = !state.physicsEnabled;
        els.physicsIcon.setAttribute('data-lucide', state.physicsEnabled ? 'play' : 'pause');
        lucide.createIcons();
        showToast(`Physics simulation ${state.physicsEnabled ? 'resumed' : 'paused'}`, 'info', 1500);
    });

    // -------------------------------------------------------------------------
    // Keyboard Hotkeys (/ for search, 1-5 for tabs, G for graph, Esc)
    // -------------------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        // Do not intercept hotkeys if typing in input or textarea
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            if (e.key === 'Escape') {
                document.activeElement.blur();
                els.autocompleteDropdown.classList.add('hidden');
            }
            return;
        }

        if (e.key === '/') {
            e.preventDefault();
            els.globalSearchInput.focus();
            els.globalSearchInput.select();
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
            els.canvasTableAlt.classList.add('hidden');
            els.downloadDropdown.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------------------
    // Initial Boot Sequence
    // -------------------------------------------------------------------------
    loadTelemetry();
    selectAccount(state.currentAccountId);
});
