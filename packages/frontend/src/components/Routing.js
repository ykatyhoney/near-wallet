import { ConnectedRouter, getRouter } from 'connected-react-router';
import isString from 'lodash.isstring';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactDOMServer from 'react-dom/server';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { Redirect, Switch } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';

import { WEB3AUTH, WEP_PHASE_ONE } from '../../../../features';
import favicon from '../../src/images/mynearwallet-cropped.svg';
import TwoFactorVerifyModal from '../components/accounts/two_factor/TwoFactorVerifyModal';
import {
    IS_MAINNET,
    PUBLIC_URL,
    SHOW_PRERELEASE_WARNING,
    // DISABLE_CREATE_ACCOUNT,
} from '../config';
import { isWhitelabel } from '../config/whitelabel';
import { Mixpanel } from '../mixpanel/index';
import * as accountActions from '../redux/actions/account';
import { handleClearAlert } from '../redux/reducers/status';
import { selectAccountSlice } from '../redux/slices/account';
import { actions as flowLimitationActions } from '../redux/slices/flowLimitation';
import { actions as tokenFiatValueActions } from '../redux/slices/tokenFiatValues';
import { TransferWizardWrapper } from '../routes/TransferWizardWrapper';
import { VerifyOwnerWrapper } from '../routes/VerifyOwnerWrapper';
import translations_en from '../translations/en.global.json';
import translations_it from '../translations/it.global.json';
import translations_kr from '../translations/kr.global.json';
import translations_pt from '../translations/pt.global.json';
import translations_ru from '../translations/ru.global.json';
import translations_tr from '../translations/tr.global.json';
import translations_ua from '../translations/ua.global.json';
import translations_vi from '../translations/vi.global.json';
import translations_zh_hans from '../translations/zh-hans.global.json';
import translations_zh_hant from '../translations/zh-hant.global.json';
import classNames from '../utils/classNames';
import getBrowserLocale from '../utils/getBrowserLocale';
import { reportUiActiveMixpanelThrottled } from '../utils/reportUiActiveMixpanelThrottled';
import ScrollToTop from '../utils/ScrollToTop';
import {
    WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS,
    WALLET_LOGIN_URL,
    WALLET_SIGN_URL,
    WALLET_SEND_MONEY_URL,
} from '../utils/wallet';
import LedgerConfirmActionModal from './accounts/ledger/LedgerConfirmActionModal';
import LedgerConnectModal from './accounts/ledger/LedgerConnectModal/LedgerConnectModalWrapper';
import { DisableTwoFactor } from './accounts/two_factor/DisableTwoFactor';
import Footer from './common/Footer';
import GlobalAlert from './common/GlobalAlert';
import MigrationBanner from './common/MigrationBanner';
import NetworkBanner from './common/NetworkBanner';
import PrivateRoute from './common/routing/PrivateRoute';
import Route from './common/routing/Route';
import GlobalStyle from './GlobalStyle';
import { GuestLanding } from './landing/GuestLanding';
import NavigationWrapper from './navigation/NavigationWrapper';
import { PageNotFound } from './page-not-found/PageNotFound';
import Privacy from './privacy/Privacy';
import Terms from './terms/Terms';
import { initAnalytics } from './wallet-migration/metrics';
import RecoveryRedirect from './wallet-migration/RecoveryRedirect';
import { getMigrationStep } from './wallet-migration/utils';
import WalletMigration, { WALLET_MIGRATION_VIEWS } from './wallet-migration/WalletMigration';
import '../index.css';

const { fetchTokenFiatValues, getTokenWhiteList } = tokenFiatValueActions;

const {
    handleClearUrl,
    handleRedirectUrl,
    handleRefreshUrl,
    promptTwoFactor,
    redirectTo,
    refreshAccount,
} = accountActions;

const { handleFlowLimitation } = flowLimitationActions;

const theme = {};

const PATH_PREFIX = PUBLIC_URL;

const Container = styled.div`
    min-height: 100vh;
    padding-bottom: 100px;
    padding-top: 75px;
    @media (max-width: 991px) {
        .App {
            .main {
                padding-bottom: 0px;
            }
        }
    }
    &.network-banner {
        @media (max-width: 450px) {
            .alert-banner,
            .lockup-avail-transfer {
                margin-top: -45px;
            }
        }
    }

    @media (max-width: 767px) {
        &.hide-footer-mobile {
            .wallet-footer {
                display: none;
            }
        }
    }
`;

class Routing extends Component {
    constructor(props) {
        super(props);

        this.pollTokenFiatValue = null;

        const languages = [
            { name: 'English', code: 'en' },
            { name: 'Italiano', code: 'it' },
            { name: 'Português', code: 'pt' },
            { name: 'Русский', code: 'ru' },
            { name: 'Tiếng Việt', code: 'vi' },
            { name: '简体中文', code: 'zh-hans' },
            { name: '繁體中文', code: 'zh-hant' },
            { name: 'Türkçe', code: 'tr' },
            { name: 'Українська', code: 'ua' },
            { name: '한국어', code: 'kr' }
        ];

        const browserLanguage = getBrowserLocale(languages.map((l) => l.code));
        const activeLang =
            localStorage.getItem('languageCode') ||
            browserLanguage ||
            languages[0].code;

        this.props.initialize({
            languages,
            options: {
                defaultLanguage: 'en',
                onMissingTranslation: ({
                    translationId,
                    defaultTranslation,
                }) => {
                    if (isString(defaultTranslation)) {
                        // do anything to change the defaultTranslation as you wish
                        return defaultTranslation;
                    } else {
                        // that's the code that can fix the issue
                        return ReactDOMServer.renderToStaticMarkup(
                            defaultTranslation
                        );
                    }
                },
                renderToStaticMarkup: ReactDOMServer.renderToStaticMarkup,
                renderInnerHtml: true,
            },
        });

        // TODO: Figure out how to load only necessary translations dynamically
        this.props.addTranslationForLanguage(translations_en, 'en');
        this.props.addTranslationForLanguage(translations_it, 'it');
        this.props.addTranslationForLanguage(translations_pt, 'pt');
        this.props.addTranslationForLanguage(translations_ru, 'ru');
        this.props.addTranslationForLanguage(translations_vi, 'vi');
        this.props.addTranslationForLanguage(translations_zh_hans, 'zh-hans');
        this.props.addTranslationForLanguage(translations_zh_hant, 'zh-hant');
        this.props.addTranslationForLanguage(translations_tr, 'tr');
        this.props.addTranslationForLanguage(translations_ua, 'ua');
        this.props.addTranslationForLanguage(translations_kr, 'kr');

        this.props.setActiveLanguage(activeLang);
        // this.addTranslationsForActiveLanguage(defaultLanguage)

        this.state = {
            openTransferPopup: false,
        };
    }

    componentDidMount = async () => {
        if (isWhitelabel && document) {
            document.title = 'MyNearWallet';
            document.querySelector('link[rel~="icon"]').href = favicon;
        }

        await initAnalytics();

        const {
            refreshAccount,
            handleRefreshUrl,
            history,
            handleRedirectUrl,
            handleClearUrl,
            router,
            handleClearAlert,
            handleFlowLimitation,
        } = this.props;

        handleRefreshUrl(router);
        refreshAccount();

        history.listen(async () => {
            handleRedirectUrl(this.props.router.location);
            handleClearUrl();
            if (
                !WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS.find(
                    (path) =>
                        this.props.router.location.pathname.indexOf(path) > -1
                )
            ) {
                await refreshAccount(true);
            }

            handleClearAlert();
            handleFlowLimitation();
        });
    };

    componentDidUpdate(prevProps) {
        const { activeLanguage, fetchTokenFiatValues, account } = this.props;

        if (
            prevProps.account.accountId !== account.accountId &&
            account.accountId !== undefined
        ) {
            this.props.getTokenWhiteList(account.accountId);
            fetchTokenFiatValues({ accountId: account.accountId });
            this.startPollingTokenFiatValue();
        }

        const prevLangCode =
            prevProps.activeLanguage && prevProps.activeLanguage.code;
        const curLangCode = activeLanguage && activeLanguage.code;
        const hasLanguageChanged = prevLangCode !== curLangCode;

        if (hasLanguageChanged) {
            // this.addTranslationsForActiveLanguage(curLangCode)
            localStorage.setItem('languageCode', curLangCode);
        }
    }

    componentWillUnmount = () => {
        this.stopPollingTokenFiatValue();
    };

    startPollingTokenFiatValue = () => {
        const { fetchTokenFiatValues, account } = this.props;

        const handlePollTokenFiatValue = async () => {
            await fetchTokenFiatValues({ accountId: account.accountId }).catch(() => {});
            if (this.pollTokenFiatValue) {
                this.pollTokenFiatValue = setTimeout(
                    () => handlePollTokenFiatValue(),
                    30000
                );
            }
        };
        this.pollTokenFiatValue = setTimeout(
            () => handlePollTokenFiatValue(),
            30000
        );
    };

    stopPollingTokenFiatValue = () => {
        clearTimeout(this.pollTokenFiatValue);
        this.pollTokenFiatValue = null;
    };

    handleTransferClick = () => {

        this.setState({ openTransferPopup: true });
        const migrationStep = getMigrationStep();

        if (window?.ExportModal?.show && ![WALLET_MIGRATION_VIEWS.LOG_OUT, WALLET_MIGRATION_VIEWS.VERIFYING].includes(migrationStep)) {
            window?.ExportModal?.show();
        }
    }

    closeTransferPopup = () => {
        this.setState({ openTransferPopup: false });
    }

    render() {
        const {
            search,
            pathname,
        } = this.props.router.location;
        const { account } = this.props;

        const hideFooterOnMobile = [
            WALLET_LOGIN_URL,
            WALLET_SEND_MONEY_URL,
            WALLET_SIGN_URL,
        ].includes(pathname.replace(/\//g, ''));

        const accountFound = this.props.account.localStorage?.accountFound;

        reportUiActiveMixpanelThrottled();

        return (
            <Container
                className={classNames([
                    'App',
                    {
                        'network-banner':
                            !IS_MAINNET || SHOW_PRERELEASE_WARNING,
                    },
                    { 'hide-footer-mobile': hideFooterOnMobile },
                ])}
                id="app-container"
            >
                <GlobalStyle />
                <ConnectedRouter
                    basename={PATH_PREFIX}
                    history={this.props.history}
                >
                    <ThemeProvider theme={theme}>
                        <ScrollToTop />
                        {pathname !== '/' && <NetworkBanner account={account} />}
                        {pathname !== '/' && <NavigationWrapper history={this.props.history}/> }
                        <GlobalAlert />
                        {
                            
                            WEP_PHASE_ONE && (
                                <Switch>
                                    <Route
                                        path={['/', '/staking', '/profile']} render={() => (
                                            <MigrationBanner
                                                account={account}
                                                onTransfer={this.handleTransferClick} 
                                            />
                                        )}
                                    />
                                </Switch>
                            )
                        }
                        {
                            WEP_PHASE_ONE && (
                                <WalletMigration
                                    open={this.state.openTransferPopup}
                                    history={this.props.history}
                                    onClose={this.closeTransferPopup}
                                />
                            )
                        }
                        <LedgerConfirmActionModal />
                        <LedgerConnectModal />
                        {account.requestPending !== null && (
                            <TwoFactorVerifyModal
                                onClose={(verified, error) => {
                                    const { account, promptTwoFactor } =
                                        this.props;
                                    Mixpanel.track('2FA Modal Verify start');
                                    // requestPending will resolve (verified == true) or reject the Promise being awaited in the method that dispatched promptTwoFactor
                                    account.requestPending(verified, error);
                                    // clears requestPending and closes the modal
                                    promptTwoFactor(null);
                                    if (error) {
                                        // tracking error
                                        Mixpanel.track(
                                            '2FA Modal Verify fail',
                                            { error: error.message }
                                        );
                                    }
                                    if (verified) {
                                        Mixpanel.track(
                                            '2FA Modal Verify finish'
                                        );
                                    }
                                }}
                            />
                        )}
                        <Switch>
                            <Redirect
                                from="//*"
                                to={{
                                    pathname: '/*',
                                    search: search,
                                }}
                            />
                            <Route
                                exact
                                path="/"
                                render={(props) => <GuestLanding {...props} onTransfer={() => this.handleTransferClick()} accountFound={accountFound} />}
                            />
                            <Route
                                exact
                                path="/transfer-wizard"
                                render={() => (
                                    <TransferWizardWrapper
                                        account={account}
                                        onTransfer={() => this.handleTransferClick()}
                                    />
                                )}
                            />
                            <PrivateRoute
                                exact
                                path="/disable-two-factor"
                                component={DisableTwoFactor}
                            />
                            <Route
                                exact
                                path="/terms"
                                component={Terms}
                                indexBySearchEngines={true}
                            />
                            <Route
                                exact
                                path="/privacy"
                                component={Privacy}
                                indexBySearchEngines={true}
                            />
                            {WEB3AUTH && (
                                <PrivateRoute
                                    exact
                                    path="/verify-owner"
                                    component={VerifyOwnerWrapper}
                                />
                            )}
                            <Route
                                exact
                                path="/recover-with-link/:accountId/:seedPhrase"
                                component={RecoveryRedirect}
                            />
                            <PrivateRoute component={PageNotFound} />
                        </Switch>
                        <Footer />
                    </ThemeProvider>
                </ConnectedRouter>
            </Container>
        );
    }
}

Routing.propTypes = {
    history: PropTypes.object.isRequired,
};

const mapDispatchToProps = {
    refreshAccount,
    handleRefreshUrl,
    handleRedirectUrl,
    handleClearUrl,
    promptTwoFactor,
    redirectTo,
    fetchTokenFiatValues,
    handleClearAlert,
    handleFlowLimitation,
    getTokenWhiteList,
};

const mapStateToProps = (state) => ({
    account: selectAccountSlice(state),
    router: getRouter(state),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withLocalize(Routing));
