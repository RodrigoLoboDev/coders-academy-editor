import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import locales from 'scratch-l10n';

import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';

import menuBarStyles from './menu-bar.css';
import styles from './settings-menu.css';

import check from './check.svg';
import languageIcon from '../language-selector/language-icon.svg';

/*
 * Sesión 32 — antes era el menú "Settings" (engranaje), con dos submenús anidados: Idioma y Tema
 * de bloques (nunca conectado a nada real en este fork, era el "high contrast"/"blocks" de
 * scratch-www). Se saca el Tema y se aplana el Idioma: en vez de engranaje + "Settings" + entrar a
 * un segundo nivel "Language" + recién ahí ver la lista, el ícono de la barra ya es el globo y un
 * solo click muestra la lista de idiomas directo.
 */
const SettingsMenu = ({
    currentLocale,
    isRtl,
    onChangeLanguage,
    onRequestClose,
    onRequestOpen,
    settingsMenuOpen
}) => (
    <div
        className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.themeMenu, {
            [menuBarStyles.active]: settingsMenuOpen
        })}
        onMouseUp={onRequestOpen}
    >
        <img src={languageIcon} />
        <MenuBarMenu
            className={menuBarStyles.menuBarMenu}
            open={settingsMenuOpen}
            place={isRtl ? 'left' : 'right'}
            onRequestClose={onRequestClose}
        >
            <MenuSection>
                {Object.keys(locales).map(locale => (
                    <MenuItem
                        key={locale}
                        className={styles.languageMenuItem}
                        isRtl={isRtl}
                        // eslint-disable-next-line react/jsx-no-bind
                        onClick={() => onChangeLanguage(locale)}
                    >
                        <img
                            className={classNames(styles.check, {
                                [styles.selected]: currentLocale === locale
                            })}
                            src={check}
                        />
                        {locales[locale].name}
                    </MenuItem>
                ))}
            </MenuSection>
        </MenuBarMenu>
    </div>
);

SettingsMenu.propTypes = {
    currentLocale: PropTypes.string,
    isRtl: PropTypes.bool,
    onChangeLanguage: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    onRequestOpen: PropTypes.func,
    settingsMenuOpen: PropTypes.bool
};

export default SettingsMenu;
