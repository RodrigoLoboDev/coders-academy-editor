import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape, defineMessages} from 'react-intl';
import VM from 'scratch-vm';

import spriteLibraryContent from '../lib/libraries/sprites.json';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';
import fetchSharedScratchAssets from '../lib/fetch-shared-scratch-assets';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    },
    codersAcademyTag: {
        defaultMessage: 'Coders Academy',
        description: 'Tag for the institutional shared sprite library',
        id: 'gui.libraryTags.codersAcademy'
    }
});

// Convierte un SharedScratchAsset (assetType "costume") en un objeto "sprite" completo, mismo
// formato que espera vm.addSprite() — un solo disfraz, sin sonidos ni bloques. rotationCenter fijo
// en el centro del lienzo/viewBox (ver docs/scratch-editor-integration.md Fase 3): el personaje
// puede no ocupar el área completa, pero el centro geométrico es una aproximación razonable sin
// pedirle al admin que lo calcule a mano.
// SVG (vectorial, formato recomendado — mismo que usa la biblioteca default de Scratch) no
// necesita el truco "diseñar al doble" que sí hace falta en bitmaps: viewBox 300x300,
// bitmapResolution 1, centro (150,150). PNG (bitmap) sigue la convención 2x: lienzo 600x600,
// bitmapResolution 2, centro (300,300) — mismo tamaño final en el escenario en ambos casos.
const sharedAssetToSpriteItem = asset => {
    const isSvg = asset.dataFormat === 'svg';
    return {
        name: asset.name,
        tags: ['coders-academy'],
        // Miniatura del selector — ver el fix en components/library/library.jsx: nuestro md5 no
        // existe en el CDN de Scratch, así que la miniatura necesita la URL real de Cloudinary.
        rawURL: asset.cloudinaryUrl,
        isStage: false,
        variables: {},
        costumes: [{
            assetId: asset.md5,
            name: asset.name,
            bitmapResolution: isSvg ? 1 : 2,
            md5ext: `${asset.md5}.${asset.dataFormat}`,
            dataFormat: asset.dataFormat,
            rotationCenterX: isSvg ? 150 : 300,
            rotationCenterY: isSvg ? 150 : 300
        }],
        sounds: [],
        blocks: {}
    };
};

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
        this.state = {sharedItems: []};
    }
    componentDidMount () {
        fetchSharedScratchAssets().then(assets => {
            const costumes = assets.filter(a => a.assetType === 'costume');
            this.setState({sharedItems: costumes.map(sharedAssetToSpriteItem)});
        });
    }
    handleItemSelect (item) {
        // Randomize position of library sprite
        randomizeSpritePosition(item);
        this.props.vm.addSprite(JSON.stringify(item)).then(() => {
            this.props.onActivateBlocksTab();
        });
    }
    render () {
        const codersAcademyTag = {tag: 'coders-academy', intlLabel: messages.codersAcademyTag};
        return (
            <LibraryComponent
                data={this.state.sharedItems.concat(spriteLibraryContent)}
                id="spriteLibrary"
                tags={[codersAcademyTag].concat(spriteTags)}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

SpriteLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(SpriteLibrary);
