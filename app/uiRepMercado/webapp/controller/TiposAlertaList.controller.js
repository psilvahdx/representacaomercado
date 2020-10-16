/* eslint-disable no-undef */
/* eslint-disable @sap/ui5-jsdocs/no-jsdoc */
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
    return BaseController.extend("ps.uiRepMercado.controller.TiposAlertaList", {

        formatter: formatter,

        onInit: function () {
            var oReguladorModel = new JSONModel({
                descricaoFilter: "",
                reguladorIdFilter: null,
                tiposAlertaRowCount: 0
            });

            this.setModel(oReguladorModel, "tiposAlertaView");

            this.getRouter().getRoute("cadTiposAlertaApp").attachPatternMatched(this._onObjectMatched, this);

        },

        _onObjectMatched: function () {
            var oTableBinding = this.getView().byId("tblTiposAlerta").getBinding("items"),
                oObject = this.getModel("userLogModel").getData();

            if (oObject.userLog.userProfile_ID !== "ADM") {
                this.getRouter().navTo("temasList");
            }

            oTableBinding.attachChange(function () {
                var sRowCount = this.getView().byId("tblTiposAlerta").getItems().length;
                this.getView().getModel("tiposAlertaView").setProperty("/tiposAlertaRowCount", sRowCount);
            }.bind(this));
            this.getView().getModel().refresh();
        },

        getUserData: function () {
            var oOwnerComponent = this.getOwnerComponent(),
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
                    },
                    error: function () {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }

        },

        onCreatePress: function () {
            this.getOwnerComponent().getRouter().navTo("detalhesTipoAlerta", {
                idTipoAlerta: "New"
            });
        },

        onTableItemPress: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext(),
                oObject = this.getModel().getObject(oContext.getPath());
            this.getOwnerComponent().getRouter().navTo("detalhesTipoAlerta", {
                idTipoAlerta: oObject.ID
            });
        },

        onClearFilter: function (oEvent) {
            var oSelKeysPerfil = this.byId("mtCBoxPerfil");
            this.getView().byId("filterDesc").setValue("");
             oSelKeysPerfil.setSelectedKeys([]);
            this.onSearch();
        },

        onSearch: function () {
            var oTableBinding = this.getView().byId("tblTiposAlerta").getBinding("items"),
                sDescFilter = this.getView().byId("filterDesc").getValue(),
                aSelKeysPerfil = this.byId("mtCBoxPerfil").getSelectedKeys(),
                aFilters = [];

            aFilters.push(new Filter({
                path: 'descricao',
                operator: FilterOperator.Contains,
                value1: sDescFilter,
                caseSensitive: false
            }));

            if (aSelKeysPerfil && aSelKeysPerfil.length > 0) {
                for (let i = 0; i < aSelKeysPerfil.length; i++) {
                    var perfil_ID = aSelKeysPerfil[i];
                    var oFilter = new Filter("perfil_ID", FilterOperator.EQ, perfil_ID);
                    aFilters.push(oFilter);
                }

            }

            oTableBinding.filter(new Filter(aFilters, true));
        },

        onPageNavButtonPress: function () {
            this.getView().byId("filterDesc").setValue("");
            this.onSearch();
            history.go(-1);
        },

        onTableTiposAlertaSelectionChange: function (oEvent) {

            var oSelContext = oEvent.getSource().getSelectedContexts();
            if (oSelContext.length > 0) {
                this.byId("btnDelTipoAlerta").setEnabled(true);
            } else {
                this.byId("btnDelTipoAlerta").setEnabled(false);
            }

        },

        onDeleteTipoAlerta: function (oEvent) {

            var oTblTpAlertaDelete = this.byId("tblTiposAlerta"),
                oSelContext = oTblTpAlertaDelete.getSelectedContexts(),
                that = this,
                sMessage = "",
                sSuccessMsg = "",
                sErrorMsg = "",
                aTipoAlertaDelete = "",
                oDeleteObjec = {
                    ids: ""
                }

            sErrorMsg = this.getResourceBundle().getText("erro_excluir_tipo_alerta");
            //Notifica que Tipo de Alerta será removido
            if (oSelContext.length > 1) {
                sMessage = this.getResourceBundle().getText("confirma_exclusao_tipos_alerta_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_tipos_alerta");
            } else {
                sMessage = this.getResourceBundle().getText("confirma_exclusao_tipo_alerta_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_tipo_alerta");
            }

            for (let i = 0; i < oSelContext.length; i++) {
                const oRegDel = this.getModel().getObject(oSelContext[i].getPath());
                aTipoAlertaDelete = aTipoAlertaDelete + oRegDel.ID + ";";
            }

            oDeleteObjec.ids = aTipoAlertaDelete;

            MessageBox.warning(
                sMessage,
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            that.sendDeleteTiposAlertaRequest(oDeleteObjec, sSuccessMsg, sErrorMsg);
                        }
                    }
                });

        },

        sendDeleteTiposAlertaRequest: function (sIdTipoAlerta, successMsg, errorMsg) {

            var oModel = this.getModel(),
                sSuccessMsg = successMsg,
                sErrorMsg = errorMsg,
                that = this;               

            oModel.create("/deleteSelectedTiposAlerta", sIdTipoAlerta, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(sSuccessMsg);
                    that.getView().getModel().refresh();
                    that.getView().byId("filterDesc").setValue("");
                    that.onSearch();
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(sErrorMsg);
                    that.getView().getModel().refresh();
                    that.getView().byId("filterDesc").setValue("");
                    that.onSearch();
                }
            });
        },
        createColumnConfig: function () {
            var aCols = [],
                oI18n = this.getResourceBundle();

            aCols.push({
                label: oI18n.getText("descricao"),
                property: 'descricao',
                type: EdmType.String
            });

            aCols.push({
                label: oI18n.getText("perfil_txt"),
                type: EdmType.String,
                property: 'perfil/descricao'
            });

            return aCols;
        },

        onExport: function () {
            var aCols, oRowBinding, oSettings, oSheet, oTable;

            if (!this._oTable) {
                this._oTable = this.byId('tblTiposAlerta');
            }

            oTable = this._oTable;
            oRowBinding = oTable.getBinding('items');

            aCols = this.createColumnConfig();

            var oModel = oRowBinding.getModel();

            oSettings = {
                workbook: {
                    columns: aCols,//,
                    //hierarchyLevel: 'Level'
                    context: {
                        sheetName: 'TiposAlerta'
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
                fileName: 'TiposAlerta.xlsx'//,
                //worker: false // We need to disable worker because we are using a MockServer as OData Service
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        }

    });
});