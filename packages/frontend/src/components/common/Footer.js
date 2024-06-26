import React from 'react';
import { Translate } from 'react-localize-redux';
import styled from 'styled-components';

import { isWhitelabel } from '../../config/whitelabel';
import NearLogo from '../../images/near.svg';
import MyNearWalletLogo from '../svg/MyNearWalletLogo';

const StyledContainer = styled.div`
    position: absolute;
    right: 0;
    left: 0;
    padding-top: 35px;
    background-color: #FFFFFF;
    font-size: 12px;
    color: #999999;
    display: flex;
    align-items: center;
    justify-content: center;

    @media (min-width: 768px) {
        justify-content: space-between;
    }

    .left {
        display: flex;
        flex-direction: column;
        align-items: center;

        @media (min-width: 768px) {
            flex-direction: row;
        }

        > div {
            text-align: center;
            margin: 20px 0 0 0;

            @media (min-width: 768px) {
                text-align: left;
                margin: 0 0 0 20px;
            }

            .color-brown-grey {
                margin: 0 5px;
            }
        }

        img {
            width: 125px;
        }

        a {
            color: #999999;
            text-decoration: underline;
        }
    }

    .center {
        display: none;
        color: #24272a;
        width: 30%;

        @media (min-width: 992px) {
            display: block;
        }
    }

    .right {
        display: none;
        font-size: 18px;
        font-weight: 600;
        line-height: 130%;

        @media (min-width: 768px) {
            display: block;
        }
    }
    
    @media(max-width: 768px) {
        padding: 30px 30px 10px;
    }
`;

const StyledLogo = styled.div`
    svg {
        width: 218px;    
    }
`;

const InnerContainer = styled.div`
    display: flex;
    width: 1224px;
    margin: 0 auto;
    justify-content: space-between;
    align-items: center;

    @media(max-width: 1352px) {
        padding: 0 64px;
    }

    @media(max-width: 991px) {
        padding: 0 24px;
    }
`;

const Footer = () => {
    return (
        <StyledContainer className='wallet-footer'>
            <InnerContainer>
                <div className='left'>
                    {
                        isWhitelabel ? (
                            <StyledLogo>
                                <MyNearWalletLogo mode='footer' />
                            </StyledLogo>
                        ) : <img src={NearLogo} alt='NEAR' />
                    }
                </div>
                <div className='support-link'>
                    <a href="https://nearhelp.zendesk.com/hc/en-us/requests/new" target="_blank" rel="noopener noreferrer">
                        Contact Support
                    </a>
                </div>
                <div>
                    &copy; {new Date().getFullYear()} <Translate id='footer.copyrights' />
                </div>
            </InnerContainer>
        </StyledContainer>
    );
};

export default Footer;
