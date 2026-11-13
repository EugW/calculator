import $ from "jquery";

import 'simplebar/dist/simplebar.css';
import "../../css/ui/Layout.css"
import "../../css/ui/LayoutTouch.css"

// Below this window width the two panels become one column.
const NARROW_WIDTH = 1150;
// From this window width the side panel fits left of the main container (the
// panel and its gap, 370px, the main container, 1020px, and the body's margins),
// and side tabs (the team) move there from the nav column.
const SIDE_PANEL_WIDTH = 1526;
// Below this window width the labeled nav column (as wide as the team
// column) no longer fits beside the main container, and its labels hide
// (the nav stays a separate icon column).
const NAV_LABEL_MIN_WIDTH = 1776;

const beforeUnloadHandler = (event) => {
    event.preventDefault();
    event.returnValue = true;
};

export class Layout {
    constructor() {
        this.initialized = 0;
        this.prevIsNarrow = null;
        this.prevIsSide = null;
    }

    init(app) {
        this.app = app;

        if (this.initialized) {
            return;
        }

        $('.gi-copyright-text').html(UI.Lang.get('layout.copyright'));
        // The nav header is created with the nav items, so it never paints
        // alone before the composition loads.
        $('.gi-layout-nav').prepend(
            $('<div class="tab-header gi-nav-header"></div>').text(UI.Lang.get('nav.title'))
        );
        $('.gi-version').html('<a href="#" class="link-whats-new">'+ app.version.replace(/[^\d\.]/, '') +'</a>');

        this.bindEvents();

        UI.TeamTab.init(app);
        UI.BuildTab.init(app);
        UI.BestArtifactTab.init(app);
        UI.BuffsTab.init(app);
        UI.RotationTab.init(app);
        UI.ArtifactsStorageTab.init(app);
        UI.GoodImportTab.init(app);
        UI.SettingsTab.init(app);

        this.addNavDivider();

        UI.StatsTabReact.init(app);
        UI.FeaturesTabReact.init(app);
        UI.WeaponSuggestTab.init(app);
        UI.ArtifactSetTab.init(app);
        UI.ArtifactsGeneratorTab.init(app);
        UI.ArtifactSubstatTab.init(app);
        UI.CompareTab.init(app);
        UI.PresetTab.init(app);
        UI.ShareTab.init(app);

        UI.ArtifactScanner.init(app);
        UI.WindowHelp.init(app);
        UI.DamageGraphModal.init(app);
        UI.WindowSelectFeatureList.init(app);
        UI.WindowSelectGroupList.init(app);

        // React windows
        UI.WeaponSelectReact.init(app);
        UI.CharSelectReact.init(app);
        UI.ArtifactSetSelectReact.init(app);
        UI.EnemySelectReact.init(app);
        UI.LockArtifacts.init(app);
        UI.SavedBuild.init(app);
        UI.EnkaImport.init(app);

        UI.TooltipArtifact.init(app);
        UI.WindowCharTalent.init(app);
        UI.ArtifactSetSettingsModal.init(app);
        UI.Sync.init(app);

        this.initialized = 1;

        $('body').addClass(UI.Lang.getLang());

        this.showChangelog();
    }

    /**
     * One nav column right of the main container holds every tab: an icon
     * with a text label each. A tab opens in its side's content column; each
     * side tracks its own active tab.
     *
     * @param {string} name
     * @param {string} tabClass
     * @param {string} containerClass
     * @param {Object} [opts] `side`: shown in the side panel when it fits,
     *     as a nav tab otherwise; `title`: the nav label's lang key
     */
    addRightTab(name, tabClass, containerClass, opts) {
        this.addNavTab('right', tabClass, containerClass, opts);

        let container = $('<div class="gi-tab-right gi-tab-container '+ containerClass +'" data-tab="'+ tabClass +'"></div>');
        if (opts && opts.side) {
            container.addClass('gi-side-tab-container');
        }
        container.appendTo('.gi-layout-right-content');
    }

    addLeftTab(name, tabClass, containerClass, opts) {
        this.addNavTab('left', tabClass, containerClass, opts);

        let container = $('<div class="gi-tab-left gi-tab-container '+ containerClass +'" data-tab="'+ tabClass +'"></div>');
        container.appendTo('.gi-layout-left-content');
    }

    addNavTab(side, tabClass, containerClass, opts) {
        opts = opts || {};
        let tab = $('<div class="gi-tab-item '+ tabClass +'" data-tab="'+ tabClass +'" data-side="'+ side +'"><div class="gi-tab-item-inner"></div><div class="gi-tab-item-label"></div></div>');
        tab.find('.gi-tab-item-label').text(opts.title ? UI.Lang.get(opts.title) : '');
        if (opts.side) {
            tab.addClass('gi-side-tab');
        }
        tab.appendTo('.gi-layout-nav-tabs');

        if ($('.gi-layout-nav-tabs .gi-tab-item[data-side='+ side +']').length == 1) {
            tab.trigger('click');
        }
    }

    addNavDivider() {
        $('.gi-layout-nav-tabs').append('<div class="flex-spacer"></div>');
    }

    refresh(opts) {
        opts = Object.assign({}, opts);
        if (!this.initialized) {
            return;
        }

        // A portal modal can remain open when responsive layout changes the active tab.
        UI.BuildTab.component?.artifactsView?.reshapeModal?.invalidate();

        let changed = this.updateLayout();
        if (!changed) {
            this.refreshActiveTabs(opts);
        }

        UI.TooltipArtifact.hide();
        $('.tooltip-wrapper').hide();
    }

    showTab(name) {
        $('.gi-tab-item.gi-'+ name +'-tab:visible').trigger('click');
    }

    refreshActiveTabs() {
        let isNarrow = $('body').hasClass('narrow');

        if (isNarrow) {
            let tabName = $('.gi-layout-nav-tabs .gi-tab-item.active').data('tab');
            this.refreshTab(tabName);
        } else {
            let tabName1 = $('.gi-layout-nav-tabs .gi-tab-item.active[data-side="left"]').data('tab');
            let tabName2 = $('.gi-layout-nav-tabs .gi-tab-item.active[data-side="right"]:visible').data('tab');

            this.refreshTab(tabName1);
            this.refreshTab(tabName2);
        }

        // Side tabs are always shown.
        $('.gi-tab-side').each((index, container) => {
            this.refreshTab($(container).data('tab'));
        });
    }

    refreshTab(tabName) {
        $('.gi-tab-container[data-tab='+ tabName +']').trigger('tab_active');
    }

    refreshTabsVisibility() {
        $('.gi-tab-container').not('.gi-tab-side').hide();
        let isNarrow = $('body').hasClass('narrow');

        if (isNarrow) {
            $('.gi-layout-right-content').find('.gi-tab-right').addClass('gi-tab-left');
            let item = $('.gi-layout-nav-tabs .gi-tab-item.active[data-side="'+ this.lastSide +'"]');
            if (!item.length) {
                item = $('.gi-layout-nav-tabs .gi-tab-item.active');
            }
            if (!item.length) {
                item = $('.gi-layout-nav-tabs .gi-tab-item').first();
            }
            this.showSingleTab(item.data('tab'));
        } else {
            $('.gi-layout-right-content').find('.gi-tab-right').removeClass('gi-tab-left');

            let item1 = $('.gi-layout-nav-tabs .gi-tab-item.active[data-side="left"]');
            if (!item1.length) {
                item1 = $('.gi-layout-nav-tabs .gi-tab-item[data-side="left"]');
            }

            // Tabs moved to the side panel are not shown in the nav column.
            let rightTabs = $('.gi-layout-nav-tabs .gi-tab-item[data-side="right"]');
            if (this.isSidePanel()) {
                rightTabs = rightTabs.not('.gi-side-tab');
            }
            let item2 = rightTabs.filter('.active');
            if (!item2.length) {
                item2 = rightTabs.first();
            }

            this.showLeftTab(item1.first().data('tab'));
            this.showRightTab(item2.first().data('tab'));
            $('.gi-tab-side').trigger('tab_active');
        }
    }

    showChangelog() {
        let lastVersion = (localStorage.last_version || '').replace(/[^\d\.]/, '');
        let curVersion = this.app.version.replace(/[^\d\.]/, '');

        if (lastVersion != curVersion) {
            localStorage.last_version = this.app.version;

            if (lastVersion) {
                UI.WindowHelp.show(UI.Lang.get('modal_window.changelog'), 'changelog');
            }
        }
    }

    /**
     * Choose the layout for the window width: one column (narrow), two
     * panels with a labeled nav column, a slim icon-only nav column where
     * labels no longer fit, or two panels with the side panel.
     *
     * @returns {boolean} whether the layout changed
     */
    updateLayout() {
        let width = $(window).width();
        let isNarrow = width < NARROW_WIDTH;
        let isSide = !isNarrow && width >= SIDE_PANEL_WIDTH;
        let slimNav = isNarrow || width < NAV_LABEL_MIN_WIDTH;

        $('body').toggleClass('narrow', isNarrow);
        $('body').toggleClass('side-panel', isSide);
        $('body').toggleClass('slim-nav', slimNav);

        // Sized after the layout classes: before them, the labeled nav column
        // can overflow the window, and its scrollbar takes from the height.
        $('.gi-main-container, .gi-layout-side').height( $(window).height() - 35 );

        if (this.prevIsNarrow == isNarrow && this.prevIsSide == isSide) {
            return false;
        }

        let narrowChanged = this.prevIsNarrow != isNarrow;
        this.prevIsNarrow = isNarrow;
        this.prevIsSide = isSide;

        this.placeSideTabs(isSide);
        if (isNarrow && narrowChanged) {
            $(window).trigger('resize');
        }
        this.refreshTabsVisibility();
        return true;
    }

    /**
     * Move the side tabs' containers into the side panel, or back into the
     * right panel. React keeps rendering into a moved container.
     *
     * @param {boolean} isSide
     */
    placeSideTabs(isSide) {
        let containers = $('.gi-side-tab-container');

        if (isSide) {
            containers.removeClass('gi-tab-right gi-tab-left').addClass('gi-tab-side');
            containers.appendTo('.gi-layout-side-content').show();
        } else {
            containers.removeClass('gi-tab-side').addClass('gi-tab-right');
            containers.appendTo('.gi-layout-right-content');
        }
    }

    isSidePanel() {
        return $('body').hasClass('side-panel');
    }

    showLeftTab(tabName) {
        $('.gi-layout-nav-tabs .gi-tab-item[data-side="left"]').removeClass('active');
        $('.gi-tab-item[data-tab='+ tabName +']').addClass('active');
        $('.gi-tab-container[data-tab='+ tabName +']').show().trigger('tab_active');

        this.lastSide = 'left';
        this.inTabChangeActions();
    }

    showRightTab(tabName) {
        $('.gi-layout-nav-tabs .gi-tab-item[data-side="right"]').removeClass('active');
        $('.gi-tab-item[data-tab='+ tabName +']').addClass('active');
        $('.gi-tab-container[data-tab='+ tabName +']').show().trigger('tab_active');

        this.lastSide = 'right';
        this.inTabChangeActions();
    }

    showSingleTab(tabName) {
        $('.gi-layout-nav-tabs .gi-tab-item').removeClass('active');
        $('.gi-tab-item[data-tab='+ tabName +']').addClass('active');
        $('.gi-tab-container[data-tab='+ tabName +']').show().trigger('tab_active');

        this.inTabChangeActions();
    }

    inTabChangeActions() {
        document.dispatchEvent(new Event('dropdown_open'));
    }

    isMobile() {
        return $('body').hasClass('narrow');
    }

    lockClosing() {
        window.addEventListener("beforeunload", beforeUnloadHandler);
    }

    unlockClosing() {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
    }

    windowWidth() {
        return Math.max(window.innerWidth, document.documentElement.clientWidth);
    }

    windowHeight() {
        return Math.max(window.innerHeight, document.documentElement.clientHeight);
    }

    bindEvents() {
        let that = this;

        $('.gi-layout-nav-tabs').on('click', '.gi-tab-item', function() {
            let side = $(this).data('side');
            let tab = $(this).data('tab');

            if (that.isMobile()) {
                $('.gi-tab-container').not('.gi-tab-side').hide();
                that.lastSide = side;
                that.showSingleTab(tab);
            } else if (side == 'left') {
                $('.gi-tab-left.gi-tab-container').hide();
                that.showLeftTab(tab);
            } else {
                $('.gi-tab-right.gi-tab-container').hide();
                that.showRightTab(tab);
            }
        });

        $(window).resize(function() {
            $('.tooltip-wrapper').hide();
            that.updateLayout();
        });

        $('.gi-lang-switch').on('click', function() {
            localStorage.lang = $(this).hasClass('lang-rus') ? 'rus' : 'eng';
            window.location.reload();
        });

        $(document).on('mouseover', '[data-tooltip]', function() {
            if (!that.isMobile()) {
                $('.tooltip-wrapper').css('max-width', 300);
                $('.tooltip-wrapper').text( $(this).data('tooltip') ).show();
            }
            return false;
        });

        $(document).on('mouseleave', '[data-tooltip]', function() {
            $('.tooltip-wrapper').hide();
            return false;
        });

        $(document).on('mousemove', '[data-tooltip]', function(e) {
            const docWidth = $(document).width();
            const width = $('.tooltip-wrapper').width();
            const height = $('.tooltip-wrapper').height();
            const offset = $(this).offset();

            let left = offset.left - width / 2;
            let top = offset.top - height - 20;

            if (top < 0) {
                top = e.clientY + 20;
            }

            if (left + width > docWidth) {
                left = docWidth - width;
            }

            if (left < 0) {
                left = 0;
            }

            $('.tooltip-wrapper').css('left', left);
            $('.tooltip-wrapper').css('top', top);

            return false;
        });

        $(document).on('click', '.link-whats-new', function() {
            UI.WindowHelp.show(UI.Lang.get('modal_window.changelog'), 'changelog');
            return false;
        });

        $(document).on('click', '.link-contacts', function() {
            UI.WindowContacts.show(this);
            return false;
        });

        $(document).on('tab_active',  function() {
            $('.tooltip-wrapper').hide();
        });

        $(document).on('click', '.gi-skill-info', function() {
            let skill = $(this).data('skill');
            let charId = $(this).closest('[data-char]').data('char');

            UI.WindowCharTalent.show(skill, charId);

            return false;
        });

        $(document).on('click', '.gi-tab-change', function() {
            let tab = $(this).data('tab');
            that.showTab(tab);
        });

        $(document).on('click', '.gi-settings-enka-import', function() {
            UI.EnkaImport.show();
            return false;
        });
    }
}
