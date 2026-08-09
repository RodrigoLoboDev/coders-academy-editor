/**
 * Connect scratch blocks with the vm
 * @param {VirtualMachine} vm - The scratch vm
 * @param {Bool} useCatBlocks - Whether to use cat blocks rendering of ScratchBlocks
 * @return {ScratchBlocks} ScratchBlocks connected with the vm
 */
export default function (vm, useCatBlocks) {
    const ScratchBlocks = useCatBlocks ? require('cat-blocks') : require('scratch-blocks');

    // Sesión 34 — parche en runtime, no en node_modules (se perdería en cualquier reinstalación).
    // scratch-blocks trae hardcodeado `Toolbox.prototype.width = 310` (= 250px del flyout de
    // bloques + 60px de la barra de categorías, ver node_modules/scratch-blocks/core/toolbox.js) —
    // nunca se recalcula solo a partir del DOM/CSS real. Al ensanchar la barra de categorías de
    // 60px a 80px (.scratchCategoryMenu en gui.css) ese total quedó desactualizado: el flyout de
    // bloques seguía posicionándose asumiendo un ancho de barra viejo, tapando ~20px de bloques.
    // Si el ancho de .scratchCategoryMenu vuelve a cambiar, este número tiene que cambiar junto
    // (250 + ancho real de la barra en px).
    ScratchBlocks.Toolbox.prototype.width = 330;

    // Sesión 34 — el nombre de categoría (ej. "Movimiento") que scratch-blocks dibuja arriba del
    // cajón de bloques se ocultó por CSS (gui.css, .blocklyFlyoutLabel { display: none }) pero
    // eso no le avisa nada al layout: scratch-blocks reserva su alto con una constante fija
    // (FlyoutButton.prototype.height = 40, "Can't be computed like the width" según su propio
    // comentario en node_modules/scratch-blocks/core/flyout_button.js) que no depende del DOM/CSS
    // — por eso quedaba un hueco vacío arriba de los bloques aunque el texto ya no se viera.
    // Parcheado en runtime (no en node_modules) para que, específicamente las labels (isLabel
    // true), midan 0 en el layout — los botones reales del flyout (ej. "Hacer una variable") usan
    // la misma clase base pero con isLabel false, así que no se tocan.
    const originalFlyoutButtonInit = ScratchBlocks.FlyoutButton.prototype.init;
    ScratchBlocks.FlyoutButton.prototype.init = function (workspace, targetWorkspace, xml, isLabel) {
        originalFlyoutButtonInit.call(this, workspace, targetWorkspace, xml, isLabel);
        if (isLabel) {
            this.height = 0;
        }
    };

    // Sesión 34 — a pedido del usuario, clickear una categoría (Movimiento, Eventos, ...) muestra
    // SOLO los bloques de esa categoría, en vez del comportamiento de fábrica de Scratch 3: mostrar
    // TODOS los bloques de TODAS las categorías concatenados en un único flyout con scroll, donde
    // clickear una categoría solo hace scroll hasta su posición
    // (node_modules/scratch-blocks/core/toolbox.js, Toolbox.prototype.showAll_ arma la lista
    // combinada, setSelectedItem/scrollToCategoryById solo mueven el scroll, nunca cambian qué hay
    // en el flyout). Se parchean acá, en runtime, los tres puntos donde scratch-blocks decide qué
    // mostrar en el flyout — no hay un flag/opción pública para este comportamiento, hay que
    // reemplazar la lógica:
    //   - populate_: arma el toolbox la primera vez (o cuando se recrea entero, ej. cambio de
    //     idioma). Antes mostraba todo; ahora muestra solo una categoría — la que estaba
    //     seleccionada antes de repoblar, si había alguna (ver más abajo, updateToolbox), o si no
    //     la primera (arranque inicial).
    //   - setSelectedItem: se dispara al clickear una categoría en la barra lateral. Antes hacía
    //     scroll dentro del flyout combinado; ahora reemplaza el contenido del flyout por el de la
    //     categoría clickeada.
    //   - refreshSelection: lo llama scratch-blocks internamente cuando cambia algo de una
    //     categoría dinámica mientras está abierta (ej. crear/renombrar una variable con la
    //     categoría Variables abierta — workspace_svg.js). Antes volvía a armar el combinado; ahora
    //     vuelve a pedir el contenido de la categoría actual (ya actualizado).
    // showCategory_ es el reemplazo de showAll_ para una sola categoría — arma el mismo XML de
    // label que showAll_ armaba por categoría (se sigue ocultando por CSS, gui.css
    // .blocklyFlyoutLabel, pero mantiene el mismo formato por si alguna categoría dinámica lo
    // necesita) y le pasa al flyout solo esa categoría en vez de la lista completa.
    ScratchBlocks.Toolbox.prototype.showCategory_ = function (category) {
        const labelString = `<xml><label text="${category.name_}" id="${category.id_}" ` +
            `category-label="true" showStatusButton="${category.showStatusButton_}" ` +
            `web-class="categoryLabel"></label></xml>`;
        const labelXML = ScratchBlocks.Xml.textToDom(labelString);
        this.flyout_.show([labelXML.firstChild].concat(category.getContents()));
    };

    ScratchBlocks.Toolbox.prototype.populate_ = function (newTree) {
        const previouslySelectedId = this.selectedItem_ ? this.selectedItem_.id_ : null;
        this.categoryMenu_.populate(newTree);
        let categoryToSelect = this.categoryMenu_.categories_[0];
        if (previouslySelectedId) {
            for (let i = 0; i < this.categoryMenu_.categories_.length; i++) {
                if (this.categoryMenu_.categories_[i].id_ === previouslySelectedId) {
                    categoryToSelect = this.categoryMenu_.categories_[i];
                    break;
                }
            }
        }
        this.setSelectedItem(categoryToSelect, false);
    };

    ScratchBlocks.Toolbox.prototype.setSelectedItem = function (item) {
        if (this.selectedItem_) {
            this.selectedItem_.setSelected(false);
        }
        this.selectedItem_ = item;
        if (this.selectedItem_) {
            this.selectedItem_.setSelected(true);
            this.showCategory_(this.selectedItem_);
        }
    };

    ScratchBlocks.Toolbox.prototype.refreshSelection = function () {
        if (this.selectedItem_) {
            this.showCategory_(this.selectedItem_);
        }
    };

    // El click real en una categoría de la barra lateral no pasa por setSelectedItem de arriba —
    // scratch-gui tiene su propio handler (src/containers/blocks.jsx, handleCategorySelected) que
    // llama a este método de acá. De fábrica hacía lo mismo que setSelectedItem original: marcar
    // seleccionada + scrollToCategoryById (posición dentro del combinado, que ya no existe).
    // Reescrito para reusar el setSelectedItem ya parcheado arriba, misma lógica en un solo lugar.
    ScratchBlocks.Toolbox.prototype.setSelectedCategoryById = function (id) {
        for (let i = 0; i < this.categoryMenu_.categories_.length; i++) {
            if (this.categoryMenu_.categories_[i].id_ === id) {
                this.setSelectedItem(this.categoryMenu_.categories_[i]);
                return;
            }
        }
    };

    const jsonForMenuBlock = function (name, menuOptionsFn, colors, start) {
        return {
            message0: '%1',
            args0: [
                {
                    type: 'field_dropdown',
                    name: name,
                    options: function () {
                        return start.concat(menuOptionsFn());
                    }
                }
            ],
            inputsInline: true,
            output: 'String',
            colour: colors.secondary,
            colourSecondary: colors.secondary,
            colourTertiary: colors.tertiary,
            colourQuaternary: colors.quaternary,
            outputShape: ScratchBlocks.OUTPUT_SHAPE_ROUND
        };
    };

    const jsonForHatBlockMenu = function (hatName, name, menuOptionsFn, colors, start) {
        return {
            message0: hatName,
            args0: [
                {
                    type: 'field_dropdown',
                    name: name,
                    options: function () {
                        return start.concat(menuOptionsFn());
                    }
                }
            ],
            colour: colors.primary,
            colourSecondary: colors.secondary,
            colourTertiary: colors.tertiary,
            colourQuaternary: colors.quaternary,
            extensions: ['shape_hat']
        };
    };


    const jsonForSensingMenus = function (menuOptionsFn) {
        return {
            message0: ScratchBlocks.Msg.SENSING_OF,
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'PROPERTY',
                    options: function () {
                        return menuOptionsFn();
                    }

                },
                {
                    type: 'input_value',
                    name: 'OBJECT'
                }
            ],
            output: true,
            colour: ScratchBlocks.Colours.sensing.primary,
            colourSecondary: ScratchBlocks.Colours.sensing.secondary,
            colourTertiary: ScratchBlocks.Colours.sensing.tertiary,
            colourQuaternary: ScratchBlocks.Colours.sensing.quaternary,
            outputShape: ScratchBlocks.OUTPUT_SHAPE_ROUND
        };
    };

    const soundsMenu = function () {
        let menu = [['', '']];
        if (vm.editingTarget && vm.editingTarget.sprite.sounds.length > 0) {
            menu = vm.editingTarget.sprite.sounds.map(sound => [sound.name, sound.name]);
        }
        menu.push([
            ScratchBlocks.ScratchMsgs.translate('SOUND_RECORD', 'record...'),
            ScratchBlocks.recordSoundCallback
        ]);
        return menu;
    };

    const costumesMenu = function () {
        if (vm.editingTarget && vm.editingTarget.getCostumes().length > 0) {
            return vm.editingTarget.getCostumes().map(costume => [costume.name, costume.name]);
        }
        return [['', '']];
    };

    const backdropsMenu = function () {
        const next = ScratchBlocks.ScratchMsgs.translate('LOOKS_NEXTBACKDROP', 'next backdrop');
        const previous = ScratchBlocks.ScratchMsgs.translate('LOOKS_PREVIOUSBACKDROP', 'previous backdrop');
        const random = ScratchBlocks.ScratchMsgs.translate('LOOKS_RANDOMBACKDROP', 'random backdrop');
        if (vm.runtime.targets[0] && vm.runtime.targets[0].getCostumes().length > 0) {
            return vm.runtime.targets[0].getCostumes().map(costume => [costume.name, costume.name])
                .concat([[next, 'next backdrop'],
                    [previous, 'previous backdrop'],
                    [random, 'random backdrop']]);
        }
        return [['', '']];
    };

    const backdropNamesMenu = function () {
        const stage = vm.runtime.getTargetForStage();
        if (stage && stage.getCostumes().length > 0) {
            return stage.getCostumes().map(costume => [costume.name, costume.name]);
        }
        return [['', '']];
    };

    const spriteMenu = function () {
        const sprites = [];
        for (const targetId in vm.runtime.targets) {
            if (!Object.prototype.hasOwnProperty.call(vm.runtime.targets, targetId)) continue;
            if (vm.runtime.targets[targetId].isOriginal) {
                if (!vm.runtime.targets[targetId].isStage) {
                    if (vm.runtime.targets[targetId] === vm.editingTarget) {
                        continue;
                    }
                    sprites.push([vm.runtime.targets[targetId].sprite.name, vm.runtime.targets[targetId].sprite.name]);
                }
            }
        }
        return sprites;
    };

    const cloneMenu = function () {
        if (vm.editingTarget && vm.editingTarget.isStage) {
            const menu = spriteMenu();
            if (menu.length === 0) {
                return [['', '']]; // Empty menu matches Scratch 2 behavior
            }
            return menu;
        }
        const myself = ScratchBlocks.ScratchMsgs.translate('CONTROL_CREATECLONEOF_MYSELF', 'myself');
        return [[myself, '_myself_']].concat(spriteMenu());
    };

    const soundColors = ScratchBlocks.Colours.sounds;

    const looksColors = ScratchBlocks.Colours.looks;

    const motionColors = ScratchBlocks.Colours.motion;

    const sensingColors = ScratchBlocks.Colours.sensing;

    const controlColors = ScratchBlocks.Colours.control;

    const eventColors = ScratchBlocks.Colours.event;

    ScratchBlocks.Blocks.sound_sounds_menu.init = function () {
        const json = jsonForMenuBlock('SOUND_MENU', soundsMenu, soundColors, []);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.looks_costume.init = function () {
        const json = jsonForMenuBlock('COSTUME', costumesMenu, looksColors, []);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.looks_backdrops.init = function () {
        const json = jsonForMenuBlock('BACKDROP', backdropsMenu, looksColors, []);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.event_whenbackdropswitchesto.init = function () {
        const json = jsonForHatBlockMenu(
            ScratchBlocks.Msg.EVENT_WHENBACKDROPSWITCHESTO,
            'BACKDROP', backdropNamesMenu, eventColors, []);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.motion_pointtowards_menu.init = function () {
        const mouse = ScratchBlocks.ScratchMsgs.translate('MOTION_POINTTOWARDS_POINTER', 'mouse-pointer');
        const json = jsonForMenuBlock('TOWARDS', spriteMenu, motionColors, [
            [mouse, '_mouse_']
        ]);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.motion_goto_menu.init = function () {
        const random = ScratchBlocks.ScratchMsgs.translate('MOTION_GOTO_RANDOM', 'random position');
        const mouse = ScratchBlocks.ScratchMsgs.translate('MOTION_GOTO_POINTER', 'mouse-pointer');
        const json = jsonForMenuBlock('TO', spriteMenu, motionColors, [
            [random, '_random_'],
            [mouse, '_mouse_']
        ]);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.motion_glideto_menu.init = function () {
        const random = ScratchBlocks.ScratchMsgs.translate('MOTION_GLIDETO_RANDOM', 'random position');
        const mouse = ScratchBlocks.ScratchMsgs.translate('MOTION_GLIDETO_POINTER', 'mouse-pointer');
        const json = jsonForMenuBlock('TO', spriteMenu, motionColors, [
            [random, '_random_'],
            [mouse, '_mouse_']
        ]);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.sensing_of_object_menu.init = function () {
        const stage = ScratchBlocks.ScratchMsgs.translate('SENSING_OF_STAGE', 'Stage');
        const json = jsonForMenuBlock('OBJECT', spriteMenu, sensingColors, [
            [stage, '_stage_']
        ]);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.sensing_of.init = function () {
        const blockId = this.id;
        const blockType = this.type;

        // Get the sensing_of block from vm.
        let defaultSensingOfBlock;
        const blocks = vm.runtime.flyoutBlocks._blocks;
        Object.keys(blocks).forEach(id => {
            const block = blocks[id];
            if (id === blockType || (block && block.opcode === blockType)) {
                defaultSensingOfBlock = block;
            }
        });

        // Function that fills in menu for the first input in the sensing block.
        // Called every time it opens since it depends on the values in the other block input.
        const menuFn = function () {
            const stageOptions = [
                [ScratchBlocks.Msg.SENSING_OF_BACKDROPNUMBER, 'backdrop #'],
                [ScratchBlocks.Msg.SENSING_OF_BACKDROPNAME, 'backdrop name'],
                [ScratchBlocks.Msg.SENSING_OF_VOLUME, 'volume']
            ];
            const spriteOptions = [
                [ScratchBlocks.Msg.SENSING_OF_XPOSITION, 'x position'],
                [ScratchBlocks.Msg.SENSING_OF_YPOSITION, 'y position'],
                [ScratchBlocks.Msg.SENSING_OF_DIRECTION, 'direction'],
                [ScratchBlocks.Msg.SENSING_OF_COSTUMENUMBER, 'costume #'],
                [ScratchBlocks.Msg.SENSING_OF_COSTUMENAME, 'costume name'],
                [ScratchBlocks.Msg.SENSING_OF_SIZE, 'size'],
                [ScratchBlocks.Msg.SENSING_OF_VOLUME, 'volume']
            ];
            if (vm.editingTarget) {
                let lookupBlocks = vm.editingTarget.blocks;
                let sensingOfBlock = lookupBlocks.getBlock(blockId);

                // The block doesn't exist, but should be in the flyout. Look there.
                if (!sensingOfBlock) {
                    sensingOfBlock = vm.runtime.flyoutBlocks.getBlock(blockId) || defaultSensingOfBlock;
                    // If we still don't have a block, just return an empty list . This happens during
                    // scratch blocks construction.
                    if (!sensingOfBlock) {
                        return [['', '']];
                    }
                    // The block was in the flyout so look up future block info there.
                    lookupBlocks = vm.runtime.flyoutBlocks;
                }
                const sort = function (options) {
                    options.sort(ScratchBlocks.scratchBlocksUtils.compareStrings);
                };
                // Get all the stage variables (no lists) so we can add them to menu when the stage is selected.
                const stageVariableOptions = vm.runtime.getTargetForStage().getAllVariableNamesInScopeByType('');
                sort(stageVariableOptions);
                const stageVariableMenuItems = stageVariableOptions.map(variable => [variable, variable]);
                if (sensingOfBlock.inputs.OBJECT.shadow !== sensingOfBlock.inputs.OBJECT.block) {
                    // There's a block dropped on top of the menu. It'd be nice to evaluate it and
                    // return the correct list, but that is tricky. Scratch2 just returns stage options
                    // so just do that here too.
                    return stageOptions.concat(stageVariableMenuItems);
                }
                const menuBlock = lookupBlocks.getBlock(sensingOfBlock.inputs.OBJECT.shadow);
                const selectedItem = menuBlock.fields.OBJECT.value;
                if (selectedItem === '_stage_') {
                    return stageOptions.concat(stageVariableMenuItems);
                }
                // Get all the local variables (no lists) and add them to the menu.
                const target = vm.runtime.getSpriteTargetByName(selectedItem);
                let spriteVariableOptions = [];
                // The target should exist, but there are ways for it not to (e.g. #4203).
                if (target) {
                    spriteVariableOptions = target.getAllVariableNamesInScopeByType('', true);
                    sort(spriteVariableOptions);
                }
                const spriteVariableMenuItems = spriteVariableOptions.map(variable => [variable, variable]);
                return spriteOptions.concat(spriteVariableMenuItems);
            }
            return [['', '']];
        };

        const json = jsonForSensingMenus(menuFn);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.sensing_distancetomenu.init = function () {
        const mouse = ScratchBlocks.ScratchMsgs.translate('SENSING_DISTANCETO_POINTER', 'mouse-pointer');
        const json = jsonForMenuBlock('DISTANCETOMENU', spriteMenu, sensingColors, [
            [mouse, '_mouse_']
        ]);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.sensing_touchingobjectmenu.init = function () {
        const mouse = ScratchBlocks.ScratchMsgs.translate('SENSING_TOUCHINGOBJECT_POINTER', 'mouse-pointer');
        const edge = ScratchBlocks.ScratchMsgs.translate('SENSING_TOUCHINGOBJECT_EDGE', 'edge');
        const json = jsonForMenuBlock('TOUCHINGOBJECTMENU', spriteMenu, sensingColors, [
            [mouse, '_mouse_'],
            [edge, '_edge_']
        ]);
        this.jsonInit(json);
    };

    ScratchBlocks.Blocks.control_create_clone_of_menu.init = function () {
        const json = jsonForMenuBlock('CLONE_OPTION', cloneMenu, controlColors, []);
        this.jsonInit(json);
    };

    ScratchBlocks.VerticalFlyout.getCheckboxState = function (blockId) {
        const monitoredBlock = vm.runtime.monitorBlocks._blocks[blockId];
        return monitoredBlock ? monitoredBlock.isMonitored : false;
    };

    ScratchBlocks.FlyoutExtensionCategoryHeader.getExtensionState = function (extensionId) {
        if (vm.getPeripheralIsConnected(extensionId)) {
            return ScratchBlocks.StatusButtonState.READY;
        }
        return ScratchBlocks.StatusButtonState.NOT_READY;
    };

    ScratchBlocks.FieldNote.playNote_ = function (noteNum, extensionId) {
        vm.runtime.emit('PLAY_NOTE', noteNum, extensionId);
    };

    // Use a collator's compare instead of localeCompare which internally
    // creates a collator. Using this is a lot faster in browsers that create a
    // collator for every localeCompare call.
    const collator = new Intl.Collator([], {
        sensitivity: 'base',
        numeric: true
    });
    ScratchBlocks.scratchBlocksUtils.compareStrings = function (str1, str2) {
        return collator.compare(str1, str2);
    };

    // Blocks wants to know if 3D CSS transforms are supported. The cross
    // section of browsers Scratch supports and browsers that support 3D CSS
    // transforms will make the return always true.
    //
    // Shortcutting to true lets us skip an expensive style recalculation when
    // first loading the Scratch editor.
    ScratchBlocks.utils.is3dSupported = function () {
        return true;
    };

    return ScratchBlocks;
}
