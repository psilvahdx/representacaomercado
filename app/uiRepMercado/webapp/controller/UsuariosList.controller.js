// @ts-nocheck
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, exportLibrary, Spreadsheet) {
    "use strict";
    var EdmType = exportLibrary.EdmType;
    return BaseController.extend("ps.uiRepMercado.controller.UsuariosList", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
        onInit: function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                usuariosTableTitle: this.getResourceBundle().getText("usuariosTableTitle"),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText")
            });
            this.getRouter().getRoute("cadUserApp").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "usuariosView");
        },

        /**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
        _onObjectMatched: function (oEvent) {

            var oModel = this.getModel(),
                oObject = this.getModel("userLogModel").getData();

            if (oObject.userLog.userProfile_ID !== "ADM") {
                this.getRouter().navTo("temasList");
            }

        },

        getUserData: function () {
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getModel("userLogModel"),
                that = this;
            if (!oObject.getProperty("/userLog/ID")) {
                oModel.read("/UsersExtensions", {
                    urlParameters: {
                        "$expand": "userProfile,acoes"
                    },
                    success: function (oData) {
                        oObject.setProperty("/userLog", oData.results[0]);
                        //that.getComissoes(oObject.getProperty("/userLog/ID"));               
                    },
                    error: function (oError) {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }

        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                sMessage,
                that = this,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("usuariosTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("usuariosTableTitle");
                sMessage = this.getResourceBundle().getText("nenhum_registro_encontrado_cadastro");
            }
            this.getModel("usuariosView").setProperty("/usuariosTableTitle", sTitle);
            this.getUserData();
        },

        onCreatePress: function (oEvent) {
            this.getRouter().navTo("detalheUsuario", {
                idUser: "New"
            });
        },

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
        onTableItemPress: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext(),
                oObject = this.getModel().getObject(oContext.getPath());

            //this.showBusy();
            this.getRouter().navTo("detalheUsuario", {
                idUser: oObject.ID
            });
        },

        buildFilters: function (oFilterUser) {

            var aFilter = new Filter([]),
                oFilter = {};

            if (oFilterUser.ID) {
                oFilter = new Filter("ID", FilterOperator.EQ, oFilterUser.ID);
                aFilter.aFilters.push(oFilter);
            }
            if (oFilterUser.nome) {
                oFilter = new Filter({
                    path: 'nome',
                    operator: FilterOperator.Contains,
                    value1: oFilterUser.nome,
                    caseSensitive: false
                });
                aFilter.aFilters.push(oFilter);
            }
            if (oFilterUser.matricula) {
                oFilter = new Filter({
                    path: 'matricula',
                    operator: FilterOperator.Contains,
                    value1: oFilterUser.matricula,
                    caseSensitive: false
                });
                aFilter.aFilters.push(oFilter);
            }
            if (oFilterUser.perfil) {
                for (let i = 0; i < oFilterUser.perfil.length; i++) {
                    var perfil_ID = oFilterUser.perfil[i];
                    oFilter = new Filter("perfil_ID", FilterOperator.EQ, perfil_ID);
                    aFilter.aFilters.push(oFilter);
                }

            }
            if (oFilterUser.cargo) {
                oFilter = new Filter({
                    path: 'cargo',
                    operator: FilterOperator.Contains,
                    value1: oFilterUser.cargo,
                    caseSensitive: false
                });
                aFilter.aFilters.push(oFilter);
            }
            if (oFilterUser.calssficCargo) {
                for (let i = 0; i < oFilterUser.calssficCargo.length; i++) {
                    var cargoClassif_ID = oFilterUser.calssficCargo[i];
                    oFilter = new Filter("cargoClassif_ID", FilterOperator.EQ, cargoClassif_ID);
                    aFilter.aFilters.push(oFilter);
                }

            }


            return aFilter;
        },

        onClearFilter: function (oEvent) {
            this.clearFilters();
        },

        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {

                this.onRefresh();
            } else {
                var aTableSearchState = [],
                    filterModel = this.getModel("filterModel"),
                    oTable = this.byId("tblUsers"),
                    oBinding = oTable.getBinding("items"),
                    oFilterUsuarios = filterModel.getProperty("/usuarios"),
                    aSelKeysPerfil = this.byId("mtCBoxPerfil").getSelectedKeys(),
                    aSelKeysCargoClassif = this.byId("mtCBoxCargoClassif").getSelectedKeys();
                if (aSelKeysPerfil && aSelKeysPerfil.length > 0) {
                    oFilterUsuarios.perfil = aSelKeysPerfil;
                } else {
                    oFilterUsuarios.perfil = [];
                }
                
                if (aSelKeysCargoClassif && aSelKeysCargoClassif.length > 0) {
                    oFilterUsuarios.calssficCargo = aSelKeysCargoClassif;
                } else {
                    oFilterUsuarios.calssficCargo = [];
                }
                aTableSearchState = this.buildFilters(oFilterUsuarios);
                oBinding.filter(aTableSearchState.aFilters);
            }

        },

        clearFilters: function () {
            var ofilterModel = this.getModel("filterModel"),
                oFilterUsuarios = ofilterModel.getProperty("/usuarios"),
                oTable = this.byId("tblUsers"),
                oBinding = oTable.getBinding("items"),
                oSelKeysPerfil = this.byId("mtCBoxPerfil"),
                oSelKeysCargoClassif = this.byId("mtCBoxCargoClassif"),
                aTableSearchState = [];

            oFilterUsuarios.perfil = [];                   
            oFilterUsuarios.calssficCargo = [];
            oFilterUsuarios.nome = "";
            oFilterUsuarios.cargo = "";
            ofilterModel.refresh();

            oSelKeysPerfil.setSelectedKeys([]);
            oSelKeysCargoClassif.setSelectedKeys([]);

            aTableSearchState = this.buildFilters(oFilterUsuarios);
            oBinding.filter(aTableSearchState.aFilters);

        },

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
        onRefresh: function () {
            var oTable = this.byId("tblUsers");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */
        _onPageNavButtonPress: function (oEvent) {
            this.clearFilters();
            history.go(-1);
        },

        onTableUsersSelectionChange: function (oEvent) {

            var oSelContext = oEvent.getSource().getSelectedContexts();
            if (oSelContext.length > 0) {
                this.byId("btnDelUser").setEnabled(true);
            } else {
                this.byId("btnDelUser").setEnabled(false);
            }

        },

        onDeleteUser: function (oEvent) {

            var oTblUsersDelete = this.byId("tblUsers"),
                oSelContext = oTblUsersDelete.getSelectedContexts(),
                that = this,
                sMessage = "",
                sSuccessMsg = "",
                sErrorMsg = "",
                aUsersDelete = "",
                oDeleteObjec = {
                    ids: ""
                }

            sErrorMsg = this.getResourceBundle().getText("erro_excluir_usuario");
            //Notifica que relacionamento entre Usuário será removido
            if (oSelContext.length > 1) {
                sMessage = this.getResourceBundle().getText("confirma_exclusao_usarios_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_usuarios");
            } else {
                sMessage = this.getResourceBundle().getText("confirma_exclusao_usario_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_usuario");
            }

            for (let i = 0; i < oSelContext.length; i++) {
                const oUserDel = this.getModel().getObject(oSelContext[i].getPath());
                aUsersDelete = aUsersDelete + oUserDel.ID + ";";
            }

            oDeleteObjec.ids = aUsersDelete;

            MessageBox.warning(
                sMessage,
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            that.sendDeleteUsuarioRequest(oDeleteObjec, sSuccessMsg, sErrorMsg);
                        }
                    }
                });

        },

        sendDeleteUsuarioRequest: function (sIdUser, successMsg, errorMsg) {

            var oModel = this.getModel(),
                sSuccessMsg = successMsg,
                sErrorMsg = errorMsg,
                that = this;

            oModel.create("/deleteSelectedUsers", sIdUser, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(sSuccessMsg);
                    that.getView().getModel().refresh();
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(sErrorMsg);
                    that.getView().getModel().refresh();
                }
            });
        },
        createColumnConfig: function (aSelectedColumns) {
            var aCols = [],
                oI18n = this.getResourceBundle();


            for (let i = 0; i < aSelectedColumns.length; i++) {
                const field = aSelectedColumns[i];

                switch (field) {
                    case 0:
                        aCols.push({
                            label: oI18n.getText("matricula_txt"),
                            property: 'ID',
                            type: EdmType.String
                        });
                        break;
                    case 1:
                        aCols.push({
                            label: oI18n.getText("nome_txt"),
                            type: EdmType.String,
                            property: 'nome'
                        });
                        break;

                    case 2:
                        aCols.push({
                            label: oI18n.getText("cargo_txt"),
                            type: EdmType.String,
                            property: 'cargo'
                        });

                        break;

                    case 3:
                        aCols.push({
                            label: oI18n.getText("perfil_txt"),
                            type: EdmType.String,
                            property: 'perfil/descricao'
                        });

                        break;

                    default:
                        aCols.push({
                            label: oI18n.getText("matricula_txt"),
                            property: 'ID',
                            type: EdmType.String
                        });

                        aCols.push({
                            label: oI18n.getText("nome_txt"),
                            type: EdmType.String,
                            property: 'nome'
                        });
                        aCols.push({
                            label: oI18n.getText("cargo_txt"),
                            type: EdmType.String,
                            property: 'cargo'
                        });

                        aCols.push({
                            label: oI18n.getText("perfil_txt"),
                            type: EdmType.String,
                            property: 'perfil/descricao'
                        });
                        break;
                }
            }

            return aCols;
        },

        onExport: function () {
            var sFragment = "ps.uiRepMercado.view.fragments.ExportUsuarios";

            this.getModel("ExportModel").refresh();
            if (!this._oDialogSelectTemaFields) {
                this._oDialogSelectTemaFields = sap.ui.xmlfragment(sFragment, this);
                this.getView().addDependent(this._oDialogSelectTemaFields);
            }
            this._oDialogSelectTemaFields.open();

        },

         _onSearchFieldNames: function(oEvent){
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "value",
                FilterOperator.Contains,
                sValue,
                false
            );
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        onSelectColumnsExportConfirm: function (oEvent) {
            var oSelContexts = oEvent.getParameter("selectedContexts"),
                aSelectedColumns = [];

            if (oSelContexts.length > 0) {
                for (let i = 0; i < oSelContexts.length; i++) {
                    const campo = oSelContexts[i].getObject();
                    aSelectedColumns.push(campo.key);
                }
            }
            this.exportToExcel(aSelectedColumns);

        },

        exportToExcel: function (aSelectedColumns) {
            var aCols, oRowBinding, oSettings, oSheet, oTable;

            if (!this._oTable) {
                this._oTable = this.byId('tblUsers');
            }

            oTable = this._oTable;
            oRowBinding = oTable.getBinding('items');

            aCols = this.createColumnConfig(aSelectedColumns);

            var oModel = oRowBinding.getModel();

            oSettings = {
                workbook: {
                    columns: aCols,//,
                    //hierarchyLevel: 'Level'
                    context: {
                        sheetName: 'Usuarios'
                    }
                },
                dataSource: {
                    type: 'odata',
                    dataUrl: oRowBinding.getDownloadUrl ? oRowBinding.getDownloadUrl() : null,
                    serviceUrl: this._sServiceUrl,
                    headers: oModel.getHeaders ? oModel.getHeaders() : null,
                    count: oRowBinding.getLength ? oRowBinding.getLength() : null,
                    useBatch: true // Default for ODataModel V2
                },
                fileName: 'Usuarios.xlsx'//,
                //worker: false // We need to disable worker because we are using a MockServer as OData Service
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        }
    });
});