import React from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';

import {setProjectUnchanged} from '../reducers/project-changed';
import {
    LoadingStates,
    defaultProjectId,
    getIsCreatingNew,
    getIsFetchingWithId,
    getIsLoading,
    getIsShowingProject,
    onFetchedProjectData,
    projectError,
    setProjectId
} from '../reducers/project-state';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../reducers/editor-tab';

import log from './log';
import storage from './storage';
import fetchProjectFromServer from './fetch-project-from-server';

/* Higher Order Component to provide behavior for loading projects by id. If
 * there's no id, the default project is loaded.
 * @param {React.Component} WrappedComponent component to receive projectData prop
 * @returns {React.Component} component with project loading behavior
 */
const ProjectFetcherHOC = function (WrappedComponent) {
    class ProjectFetcherComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'fetchProject'
            ]);
            storage.setProjectHost(props.projectHost);
            storage.setProjectToken(props.projectToken);
            storage.setAssetHost(props.assetHost);
            storage.setTranslatorFunction(props.intl.formatMessage);
            // props.projectId might be unset, in which case we use our default;
            // or it may be set by an even higher HOC, and passed to us.
            // Either way, we now know what the initial projectId should be, so
            // set it in the redux store.
            if (
                props.projectId !== '' &&
                props.projectId !== null &&
                typeof props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(props.projectId.toString());
            }
        }
        componentDidUpdate (prevProps) {
            // 15/08/2026 — bug real reportado en producción: elegir OTRA plantilla ya guardada
            // desde "Mis plantillas" (docente), o "Empezar"/"Continuar" una tarea asignada desde
            // "Tareas asignadas" (alumno), no abría el proyecto nuevo — quedaba mostrando el que
            // ya estaba abierto. Causa: este HOC solo despachaba setProjectId() en el constructor
            // (arriba); nuestro router (render-gui.jsx) cambia el projectId/templateId de la URL
            // SIN desmontar/remontar este componente (misma posición en el árbol, React solo
            // actualiza props), así que el constructor nunca se volvía a ejecutar y el id nuevo
            // nunca llegaba a Redux. En el caso del alumno el síntoma era parcial y confuso: la
            // franja de tarea (título/relato/misión) sí se actualizaba, porque esa la arma
            // StudentEditorRoute con su propio useEffect que sí reacciona al cambio de projectId
            // — pero el VM/los bloques de Scratch, que dependen 100% de este HOC, se quedaban
            // congelados en el proyecto anterior.
            // El reducer (project-state.js, case SET_PROJECT_ID) ya soporta perfectamente que se
            // vuelva a despachar con un id distinto estando en SHOWING_WITH_ID — solo faltaba
            // volver a llamarlo acá cuando la prop cambia.
            if (
                prevProps.projectId !== this.props.projectId &&
                this.props.projectId !== '' &&
                this.props.projectId !== null &&
                typeof this.props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(this.props.projectId.toString());
            }
            if (prevProps.projectHost !== this.props.projectHost) {
                storage.setProjectHost(this.props.projectHost);
            }
            if (prevProps.projectToken !== this.props.projectToken) {
                storage.setProjectToken(this.props.projectToken);
            }
            if (prevProps.assetHost !== this.props.assetHost) {
                storage.setAssetHost(this.props.assetHost);
            }
            if (this.props.isFetchingWithId && !prevProps.isFetchingWithId) {
                this.fetchProject(this.props.reduxProjectId, this.props.loadingState);
            }
            if (this.props.isShowingProject && !prevProps.isShowingProject) {
                this.props.onProjectUnchanged();
            }
            if (this.props.isShowingProject && (prevProps.isLoadingProject || prevProps.isCreatingNew)) {
                this.props.onActivateTab(BLOCKS_TAB_INDEX);
            }
        }
        fetchProject (projectId, loadingState) {
            if (projectId === defaultProjectId) {
                // El proyecto en blanco (id sentinela '0') viene embebido en el build — nunca pasa
                // por la red, se resuelve del builtinHelper cacheado por storage.js al arrancar.
                return storage
                    .load(storage.AssetType.Project, projectId, storage.DataFormat.JSON)
                    .then(projectAsset => {
                        if (projectAsset) {
                            this.props.onFetchedProjectData(projectAsset.data, loadingState);
                        } else {
                            throw new Error('Could not find project');
                        }
                    })
                    .catch(err => {
                        this.props.onError(err);
                        log.error(err);
                    });
            }
            // Proyecto real, guardado en la API de Coders Academy — ver fetch-project-from-server.js.
            return fetchProjectFromServer(projectId)
                .then(projectJsonString => {
                    this.props.onFetchedProjectData(projectJsonString, loadingState);
                })
                .catch(err => {
                    this.props.onError(err);
                    log.error(err);
                });
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                assetHost,
                intl,
                isLoadingProject: isLoadingProjectProp,
                loadingState,
                onActivateTab,
                onError: onErrorProp,
                onFetchedProjectData: onFetchedProjectDataProp,
                onProjectUnchanged,
                projectHost,
                projectId,
                reduxProjectId,
                setProjectId: setProjectIdProp,
                /* eslint-enable no-unused-vars */
                isFetchingWithId: isFetchingWithIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    fetchingProject={isFetchingWithIdProp}
                    {...componentProps}
                />
            );
        }
    }
    ProjectFetcherComponent.propTypes = {
        assetHost: PropTypes.string,
        canSave: PropTypes.bool,
        intl: intlShape.isRequired,
        isCreatingNew: PropTypes.bool,
        isFetchingWithId: PropTypes.bool,
        isLoadingProject: PropTypes.bool,
        isShowingProject: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onActivateTab: PropTypes.func,
        onError: PropTypes.func,
        onFetchedProjectData: PropTypes.func,
        onProjectUnchanged: PropTypes.func,
        projectHost: PropTypes.string,
        projectToken: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        setProjectId: PropTypes.func
    };
    ProjectFetcherComponent.defaultProps = {
        assetHost: 'https://assets.scratch.mit.edu',
        projectHost: 'https://projects.scratch.mit.edu'
    };

    const mapStateToProps = state => ({
        isCreatingNew: getIsCreatingNew(state.scratchGui.projectState.loadingState),
        isFetchingWithId: getIsFetchingWithId(state.scratchGui.projectState.loadingState),
        isLoadingProject: getIsLoading(state.scratchGui.projectState.loadingState),
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        reduxProjectId: state.scratchGui.projectState.projectId
    });
    const mapDispatchToProps = dispatch => ({
        onActivateTab: tab => dispatch(activateTab(tab)),
        onError: error => dispatch(projectError(error)),
        onFetchedProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        onProjectUnchanged: () => dispatch(setProjectUnchanged())
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(ProjectFetcherComponent));
};

export {
    ProjectFetcherHOC as default
};
