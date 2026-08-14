import {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {createProject, getIsShowingWithoutId, manualUpdateProject} from '../../reducers/project-state';

/*
 * 14/08/2026 — autoguardado al confirmar el nombre del proyecto. El input de título de la barra
 * superior (ProjectTitleInput, componente compartido de scratch-gui) ya dispara `setProjectTitle`
 * en blur y en Enter por su cuenta (ver BufferedInput en forms/buffered-input-hoc.jsx) — lo único
 * que faltaba era que ese cambio TAMBIÉN dispare un guardado real contra la API, no solo actualice
 * el título en el estado de Redux.
 *
 * Sin UI propia — es puro efecto. Se monta vía `rightContent` (mismo truco que ExitEditorGuard)
 * para vivir dentro del <Provider> interno del editor y poder usar connect().
 *
 * Mismo criterio de guardado que ExitEditorGuard/menu-bar.jsx: sin id todavía (plantilla recién
 * abierta, "Archivo → Nuevo") crea; con id, actualiza.
 */
const EditorTitleAutosaveComponent = ({isShowingWithoutId, onClickCreateNew, onClickSave, projectTitle}) => {
    // Se salta el primer valor de projectTitle (el título con el que carga la pantalla) — sin
    // este guardia, el efecto dispararía un guardado apenas se monta el editor, antes de que el
    // docente haya tocado nada.
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (isShowingWithoutId) {
            onClickCreateNew();
        } else {
            onClickSave();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectTitle]);

    return null;
};

EditorTitleAutosaveComponent.propTypes = {
    isShowingWithoutId: PropTypes.bool,
    onClickCreateNew: PropTypes.func.isRequired,
    onClickSave: PropTypes.func.isRequired,
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    isShowingWithoutId: getIsShowingWithoutId(state.scratchGui.projectState.loadingState),
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    onClickCreateNew: () => dispatch(createProject()),
    onClickSave: () => dispatch(manualUpdateProject())
});

export default connect(mapStateToProps, mapDispatchToProps)(EditorTitleAutosaveComponent);
