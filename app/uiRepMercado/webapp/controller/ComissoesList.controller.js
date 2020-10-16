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
    return BaseController.extend("ps.uiRepMercado.controller.ComissoesList", {

        formatter: formatter,

        onInit: function () {
            var oComissaoModel = new JSONModel({
                descricaoFilter: "",
                reguladorFilter: "",
                reguladorFilterId: null,
                comissoesRowCount: 0
            });

            this.setModel(oComissaoModel, "comissoesView");

            this.getRouter().getRoute("cadComissoesApp").attachPatternMatched(this._onObjectMatched, this);

        },

        _onObjectMatched: function () {
            var oTableBinding = this.getView().byId("tblComissoes").getBinding("items"),
                oObject = this.getModel("userLogModel").getData();

            if (oObject.userLog.userProfile_ID !== "ADM") {
                this.getRouter().navTo("temasList");
            }

            oTableBinding.attachChange(function () {
                var sRowCount = this.getView().byId("tblComissoes").getItems().length;
                this.getView().getModel("comissoesView").setProperty("/comissoesRowCount", sRowCount);
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
            this.getOwnerComponent().getRouter().navTo("detalhesComissao", {
                idComissao: "New"
            });
        },

        onTableItemPress: function (oEvent) {
            var sId = oEvent.getParameter("listItem").getCells()[0].getText()
            this.getOwnerComponent().getRouter().navTo("detalhesComissao", {
                idComissao: sId
            });
        },

        onClearFilter: function () {
            this.getView().byId("filterDesc").setValue("");
            this.getView().getModel("comissoesView").setProperty("/reguladorFilterId", null);
            this.getView().getModel("comissoesView").setProperty("/reguladorFilter", "");

            this.onSearch();
        },

        onSearch: function () {
            var oTableBinding = this.getView().byId("tblComissoes").getBinding("items"),
                sDescFilter = this.getView().byId("filterDesc").getValue(),
                sReguladorFilter = this.getView().getModel("comissoesView").getProperty("/reguladorFilterId"),
                bAnd = false,
                aFilters = [];

            aFilters.push(new Filter({
                path: 'descricao',
                operator: FilterOperator.Contains,
                value1: sDescFilter,
                caseSensitive: false
            }));
            if (sReguladorFilter) {
                aFilters.push(new Filter("regulador_ID", FilterOperator.EQ, sReguladorFilter));
                bAnd = true;
            }

            oTableBinding.filter(new Filter(aFilters, bAnd));
        },

        onPageNavButtonPress: function () {
            this.getView().byId("filterDesc").setValue("");
            this.getView().getModel("comissoesView").setProperty("/reguladorFilterId", null);
            this.getView().getModel("comissoesView").setProperty("/reguladorFilter", "");

            this.onSearch();
            history.go(-1);
        },

        showReguladorValueHelp: function () {
            if (!this._oDialogReguladores) {
                this._oDialogReguladores = sap.ui.xmlfragment("ps.uiRepMercado.view.fragments.Reguladores", this);
                this.getView().addDependent(this._oDialogReguladores);
                this.getView().getModel().read("/Reguladores", {
                    success: function (oData) {
                        var oReguladoresModel = new JSONModel(oData);
                        this.getView().setModel(oReguladoresModel, "reguladoresModel");
                    }.bind(this),
                    error: function (oError) {
                        var oErrorMsg = JSON.parse(oError.responseText);
                        MessageBox.error(oErrorMsg.error.message.value);
                    }
                });
            }
            this._oDialogReguladores.open();
        },

        onReguladoresConfirm: function (oEvent) {
            if (oEvent.getParameter("selectedItem")) {
                var sReguladorPath = oEvent.getParameter("selectedItem").getBindingContext("reguladoresModel").getPath();
                var oRegulador = this.getView().getModel("reguladoresModel").getProperty(sReguladorPath);
                this.getView().getModel("comissoesView").setProperty("/reguladorFilter", oRegulador.descricao);
                this.getView().getModel("comissoesView").setProperty("/reguladorFilterId", oRegulador.ID);
            } else {
                this.getView().getModel("comissoesView").setProperty("/reguladorFilter", "");
                this.getView().getModel("comissoesView").setProperty("/reguladorFilterId", null);
            }
            this.getView().getModel("comissoesView").refresh();
        },

        onSearchReguladores: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oBinding = oEvent.getSource().getBinding("items");
            var aFilters = [];
            // @ts-ignore
            aFilters.push(new Filter({
                path: 'descricao',
                operator: FilterOperator.Contains,
                value1: sValue,
                caseSensitive: false
            }));
            oBinding.filter(aFilters);
        },

        onTableComissoesSelectionChange: function (oEvent) {

            var oSelContext = oEvent.getSource().getSelectedContexts();
            if (oSelContext.length > 0) {
                this.byId("btnDelComissao").setEnabled(true);
            } else {
                this.byId("btnDelComissao").setEnabled(false);
            }

        },

        onDeleteComissao: function (oEvent) {

            var oTblComissDelete = this.byId("tblComissoes"),
                oSelContext = oTblComissDelete.getSelectedContexts(),
                that = this,
                sMessage = "",
                sSuccessMsg = "",
                sErrorMsg = "",
                aComissDelete = "",
                oDeleteObjec = {
                    ids: ""
                }

            sErrorMsg = this.getResourceBundle().getText("erro_excluir_comissao");
            //Notifica que a Comissão sera excluida
            if (oSelContext.length > 1) {
                sMessage = this.getResourceBundle().getText("confirma_exclusao_comissoes_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_comissoes");
            } else {
                sMessage = this.getResourceBundle().getText("confirma_exclusao_comissao_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_comissao");
            }

            for (let i = 0; i < oSelContext.length; i++) {
                const oComissDel = this.getModel().getObject(oSelContext[i].getPath());
                aComissDelete = aComissDelete + oComissDel.ID + ";";
            }

            oDeleteObjec.ids = aComissDelete;

            MessageBox.warning(
                sMessage,
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            that.sendDeleteComissoesRequest(oDeleteObjec, sSuccessMsg, sErrorMsg);
                        }
                    }
                });

        },

        sendDeleteComissoesRequest: function (sIdComissao, successMsg, errorMsg) {

            var oModel = this.getModel(),
                sSuccessMsg = successMsg,
                sErrorMsg = errorMsg,
                that = this;

            oModel.create("/deleteSelectedComissoes", sIdComissao, {
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
        createColumnConfig: function () {
            var aCols = [],
                oI18n = this.getResourceBundle();

            aCols.push({
                label: oI18n.getText("descricao"),
                property: 'descricao',
                type: EdmType.String
            });

            aCols.push({
                label: oI18n.getText("descricao"),
                property: 'regulador/descricao',
                type: EdmType.String
            });


            return aCols;
        },

        onExport: function () {
            var aCols, oRowBinding, oSettings, oSheet, oTable;

            if (!this._oTable) {
                this._oTable = this.byId('tblComissoes');
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
                        sheetName: 'Comissões'
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
                fileName: 'Comissões.xlsx'//,
                //worker: false // We need to disable worker because we are using a MockServer as OData Service
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        }
    });
});