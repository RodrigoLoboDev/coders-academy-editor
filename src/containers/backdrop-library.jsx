import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import VM from 'scratch-vm';

import backdropLibraryContent from '../lib/libraries/backdrops.json';
import backdropTags from '../lib/libraries/backdrop-tags';
import fetchSharedScratchAssets from '../lib/fetch-shared-scratch-assets';
import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Backdrop',
        description: 'Heading for the backdrop library',
        id: 'gui.costumeLibrary.chooseABackdrop'
    },
    codersAcademyTag: {
        defaultMessage: 'Coders Academy',
        description: 'Tag for the institutional shared backdrop library',
        id: 'gui.libraryTags.codersAcademy'
    }
});

// rotationCenter fijo (480,360) = mitad de un archivo de 960x720px (2x el escenario 480x360) con
// bitmapResolution 2 — misma convención que usan los fondos default de Scratch (ver Arctic en
// backdrops.json). Especificación de arte entregada al admin en docs/scratch-editor-integration.md.
const sharedAssetToBackdropItem = asset => ({
    name: asset.name,
    tags: ['coders-academy'],
    rawURL: asset.cloudinaryUrl,
    assetId: asset.md5,
    bitmapResolution: 2,
    dataFormat: asset.dataFormat,
    md5ext: `${asset.md5}.${asset.dataFormat}`,
    rotationCenterX: 480,
    rotationCenterY: 360
});

class BackdropLibrary extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
        this.state = {sharedItems: []};
    }
    componentDidMount () {
        fetchSharedScratchAssets().then(assets => {
            const backdrops = assets.filter(a => a.assetType === 'backdrop');
            this.setState({sharedItems: backdrops.map(sharedAssetToBackdropItem)});
        });
    }
    handleItemSelect (item) {
        const vmBackdrop = {
            name: item.name,
            rotationCenterX: item.rotationCenterX,
            rotationCenterY: item.rotationCenterY,
            bitmapResolution: item.bitmapResolution,
            skinId: null
        };
        // Do not switch to stage, just add the backdrop
        this.props.vm.addBackdrop(item.md5ext, vmBackdrop);
    }
    render () {
        const codersAcademyTag = {tag: 'coders-academy', intlLabel: messages.codersAcademyTag};
        return (
            <LibraryComponent
                data={this.state.sharedItems.concat(backdropLibraryContent)}
                id="backdropLibrary"
                tags={[codersAcademyTag].concat(backdropTags)}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

BackdropLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(BackdropLibrary);
