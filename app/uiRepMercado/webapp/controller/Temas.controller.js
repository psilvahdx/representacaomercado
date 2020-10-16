// @ts-nocheck
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
    "sap/ui/model/Sorter",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, Sorter, ChartFormatter, exportLibrary, Spreadsheet) {
    "use strict";
    var EdmType = exportLibrary.EdmType;
    return BaseController.extend("ps.uiRepMercado.controller.Temas", {

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

            this._oDialogDetalhesAlerta = sap.ui.xmlfragment("ps.uiRepMercado.view.fragments.DetalhesAlerta", this);
            this.getView().addDependent(this._oDialogDetalhesAlerta);

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "temasView");

            // Add the worklist page to the flp routing history
            this.addHistoryEntry({
                title: this.getResourceBundle().getText("temasViewTitle"),
                icon: "sap-icon://table-view",
                intent: "#RepresentacaoMercado-display"
            }, true);

            var odtrPeriodo = this.byId("dtrPeriodo"),
                vToday = new Date();
            odtrPeriodo.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            odtrPeriodo.setDateValue(new Date(vToday.getFullYear() - 1, vToday.getMonth(), vToday.getDate()));
            odtrPeriodo.setSecondDateValue(vToday);

            //this.getOwnerComponent().setBusy(true);
            this.showBusy();

        },

        onAfterRendering: function () {
            this.getUserData();
            var oModel = this.getModel(),
                that = this;
            oModel.attachRequestFailed(function (oEvent) {

                var oResponse = oEvent.getParameter("response"),
                    sUrl = oEvent.getParameter("url");
                that.byId("tblTemas").setBusy(false);
                that.byId("tblTemas").setNoDataText(that.byId("tblTemas").getNoDataText());
                that.hideBusy();
                if (sUrl.includes("Temas")) {
                    if (oResponse && oResponse.statusCode === "404") {
                        var oJsonResponseText = JSON.parse(oResponse.responseText);
                        that.getOwnerComponent()._genericErrorMessage(oJsonResponseText.error.message.value);
                    }
                }


            });

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
                        that.hideBusy();

                        if (oObject.getProperty("/userLog/userProfile_ID") === "ADM") {
                            that.byId("cadTab").setVisible(true);
                            that.byId("dashBoardTab").setVisible(true);
                        }
                        if (oObject.getProperty("/userLog/acoes/isDashBoardVisible")) {
                            that.byId("dashBoardTab").setVisible(true);
                        }

                    },
                    error: function (oError) {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                        that.hideBusy();
                    }

                });
            }
            this.getComissoesUsuario();

        },

        getComissoesUsuario: function () {
            var oModel = this.getModel(),                
                that = this;

            oModel.read("/Comissoes", {
                success: function (oData) {
                    var oComissoesUsuarioModel = new JSONModel(oData);
                    sap.ui.getCore().setModel(oComissoesUsuarioModel, "comissoesUsuarioModel");
                },
                error: function (oError) {
                    //oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    that.hideBusy();
                }

            });
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
            // @ts-ignore
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
                sMessage = this.getResourceBundle().getText("nenhum_registro_encontrado_cadastro");
                var oFilterData = this.getModel("filterModel").getData();
                if (oFilterData.temas.tema !== "") {
                    MessageBox.information(
                        sMessage,
                        {
                            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                            onClose: function (sAction) {
                                if (sAction === MessageBox.Action.YES) {
                                    that.getRouter().navTo("detalheTema", {
                                        idTema: "New"
                                    });
                                }
                            }
                        }
                    );
                }


            }
            this.getModel("temasView").setProperty("/worklistTableTitle", sTitle);
            //this.getUserData();
            this._bindChart();
        },

        onCreatePress: function (oEvent) {
            this.getRouter().navTo("detalheTema", {
                idTema: "New"
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
            this.getRouter().navTo("detalheTema", {
                idTema: oObject.ID
            });
        },

        createFilter: function (key, value, operator, useToLower) {
            return new Filter(useToLower ? "tolower(" + key + ")" : key, operator, useToLower ? "'" + value.toLowerCase() + "'" : value)
        },

        buildFilters: function (oFilterTema) {

            var aFilter = new Filter([]),
                oFilter = {};

            if (oFilterTema.tema) {
                //oFilter = this.createFilter("descricao", oFilterTema.tema, FilterOperator.Contains,true);
                oFilter = new Filter({
                    path: 'descricao',
                    operator: FilterOperator.Contains,
                    value1: oFilterTema.tema,
                    caseSensitive: false
                });
                aFilter.aFilters.push(oFilter);
            }
            if (oFilterTema.status) {
                for (let i = 0; i < oFilterTema.status.length; i++) {
                    var status_ID = oFilterTema.status[i];
                    oFilter = new Filter("status_ID", FilterOperator.EQ, status_ID);
                    aFilter.aFilters.push(oFilter);
                }

            }
            if (oFilterTema.comissoes) {
                for (let i = 0; i < oFilterTema.comissoes.length; i++) {
                    var comissao_ID = oFilterTema.comissoes[i];
                    oFilter = new Filter("comissao_ID", FilterOperator.EQ, comissao_ID);
                    aFilter.aFilters.push(oFilter);
                }

            }

            return aFilter;
        },

        onClearFilter: function (oEvent) {
            var ofilterModel = this.getModel("filterModel"),
                oFilterTemas = ofilterModel.getProperty("/temas"),
                oTable = this.byId("tblTemas"),
                oBinding = oTable.getBinding("items"),
                oSelKeysStatus = this.byId("mtCBoxStatus"),
                oSelKeysComis = this.byId("mtCBoxComissoes"),
                aTableSearchState = [];

            oFilterTemas.tema = "";
            oFilterTemas.status = [];
            oFilterTemas.comissoes = [];
            ofilterModel.refresh();

            oSelKeysStatus.setSelectedKeys([]);
            oSelKeysComis.setSelectedKeys([]);

            aTableSearchState = this.buildFilters(oFilterTemas);
            oBinding.filter(aTableSearchState.aFilters);

        },

        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {

                this.onRefresh();
            } else {
                var aTableSearchState = [],
                    filterModel = this.getModel("filterModel"),
                    oTable = this.byId("tblTemas"),
                    oBinding = oTable.getBinding("items"),
                    oFilterTemas = filterModel.getProperty("/temas"),
                    aSelKeysStatus = this.byId("mtCBoxStatus").getSelectedKeys(),
                    aSelKeysComis = this.byId("mtCBoxComissoes").getSelectedKeys();
                if (aSelKeysStatus && aSelKeysStatus.length > 0) {
                    oFilterTemas.status = aSelKeysStatus;
                } else {
                    oFilterTemas.status = [];
                }
                if (aSelKeysComis && aSelKeysComis.length > 0) {
                    oFilterTemas.comissoes = aSelKeysComis;
                } else {
                    oFilterTemas.comissoes = [];
                }

                aTableSearchState = this.buildFilters(oFilterTemas);
                oBinding.filter(aTableSearchState.aFilters);
                //this._applySearch(aTableSearchState);
            }

        },

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
        onRefresh: function () {
            var oTable = this.byId("tblTemas");
            oTable.getBinding("items").refresh();
        },

        onCadUserTilePress: function (oEvent) {
            this.getRouter().navTo("cadUserApp");
        },

        onCadReguladoresTilePress: function () {
            this.getRouter().navTo("cadReguladoresApp");
        },

        onCadComissoesTilePress: function () {
            this.getRouter().navTo("cadComissoesApp");
        },
        onCadTiposAlertaTilePress: function () {
            this.getRouter().navTo("cadTiposAlertaApp");
        },
        ///DashBoard

        handlePeriodoChange: function (oEvent) {
            var sFrom = oEvent.getParameter("from"),
                sTo = oEvent.getParameter("to"),
                bValid = oEvent.getParameter("valid"),
                btnFiltrar = this.byId("btnFiltrarDashBoard"),
                oEventSource = oEvent.getSource();
            //oText = this.byId("TextEvent");

            //this._iEvent++;

            //oText.setText("Id: " + oEventSource.getId() + "\nFrom: " + sFrom + "\nTo: " + sTo);

            if (bValid) {
                oEventSource.setValueState("None");
                btnFiltrar.setEnabled(true);
            } else {
                oEventSource.setValueState("Error");
                btnFiltrar.setEnabled(false);
            }
        },

        onSearchDashBoard: function (oEvent) {
            this._bindChart();
        },

        onClearDashBoardFilter: function () {

            var odtrPeriodo = this.byId("dtrPeriodo"),
                vToday = new Date();
            odtrPeriodo.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            odtrPeriodo.setDateValue(new Date(vToday.getFullYear() - 1, vToday.getMonth(), vToday.getDate()));
            odtrPeriodo.setSecondDateValue(vToday);

            this._bindChart();
        },

        _bindChart: function () {
            sap.viz.ui5.api.env.Format.numericFormatter(ChartFormatter.getInstance());
            var formatPattern = ChartFormatter.DefaultPattern;
            var sTitleFontSize = "13px",
                oObjectUser = this.getModel("userLogModel").getData(),
                oVizFrame = this.getView().byId("idVizFrame"),
                oVizFrameTemasPorCriticidade = this.getView().byId("idVizFrameTemasPorCriticidade"),
                oVizFrameComissSemRep = this.getView().byId("idVizFrameComissSemRep"),
                oVizFrameComissComRep = this.getView().byId("idVizFrameComissComRep"),
                oVizFrameRepMercado = this.getView().byId("idVizFrameRepMercado"),
                oVizFrameRepPorCargo = this.getView().byId("idVizFrameRepPorCargo");

            this.showBusy();
            //Temas Por Regulador
            oVizFrame.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.SHORTFLOAT_MFD2,
                        visible: true,
                        showTotal: true
                    },
                    dataShape: {
                        primaryAxis: ["line", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar"]
                    },
                    colorPalette: [
                        "sapUiChartPaletteSemanticNeutralDark2",
                        "sapUiChartPaletteSequentialHue1Light3",
                        "sapUiChartPaletteSequentialHue1Light2",
                        "sapUiChartPaletteSequentialHue1Light1",
                        "sapUiChartPaletteSequentialHue1",
                        "sapUiChartPaletteSequentialHue1Dark1",
                        "sapUiChartPaletteSequentialHue1Dark2",
                        "sapUiChartPaletteSequentialNeutralLight3",
                        "sapUiChartPaletteSequentialNeutralLight2",
                        "sapUiChartPaletteSequentialNeutralLight1",
                        "sapUiChartPaletteSequentialNeutral",
                        "sapUiChartPaletteSequentialNeutralDark1",
                        "sapUiChartPaletteSequentialNeutralDark2"
                    ]
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: true,
                    text: this.getResourceBundle().getText("temas_por_reguladores_title"),
                    style: {
                        fontSize: sTitleFontSize
                    }
                }
            });

            //Temas por Criticidade
            oVizFrameTemasPorCriticidade.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.SHORTFLOAT_MFD2,
                        visible: true,
                        showTotal: true
                    },
                    dataShape: {
                        primaryAxis: ["line", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar"]
                    },
                    colorPalette: [
                        "sapUiChartPaletteSemanticNeutralDark2",
                        "sapUiChartPaletteSequentialHue1Light3",
                        "sapUiChartPaletteSequentialHue1Light2",
                        "sapUiChartPaletteSequentialHue1Light1",
                        "sapUiChartPaletteSequentialHue1",
                        "sapUiChartPaletteSequentialHue1Dark1",
                        "sapUiChartPaletteSequentialHue1Dark2",
                        "sapUiChartPaletteSequentialNeutralLight3",
                        "sapUiChartPaletteSequentialNeutralLight2",
                        "sapUiChartPaletteSequentialNeutralLight1",
                        "sapUiChartPaletteSequentialNeutral",
                        "sapUiChartPaletteSequentialNeutralDark1",
                        "sapUiChartPaletteSequentialNeutralDark2"
                    ]
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: true,
                    text: this.getResourceBundle().getText("temas_por_criticidade_title"),
                    style: {
                        fontSize: sTitleFontSize
                    }
                }
            });


            //Indicações/representantes por Cargo
            oVizFrameRepPorCargo.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.SHORTFLOAT_MFD2,
                        visible: true,
                        showTotal: true
                    },
                    dataShape: {
                        primaryAxis: ["line", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar"]
                    },
                    colorPalette: [
                        "sapUiChartPaletteSemanticNeutralDark2",
                        "sapUiChartPaletteSequentialHue1Light3",
                        "sapUiChartPaletteSequentialHue1Light2",
                        "sapUiChartPaletteSequentialHue1Light1",
                        "sapUiChartPaletteSequentialHue1",
                        "sapUiChartPaletteSequentialHue1Dark1",
                        "sapUiChartPaletteSequentialHue1Dark2",
                        "sapUiChartPaletteSequentialNeutralLight3",
                        "sapUiChartPaletteSequentialNeutralLight2",
                        "sapUiChartPaletteSequentialNeutralLight1",
                        "sapUiChartPaletteSequentialNeutral",
                        "sapUiChartPaletteSequentialNeutralDark1",
                        "sapUiChartPaletteSequentialNeutralDark2"
                    ]
                },
                legendGroup: {
                    layout: {
                        position: "bottom"
                    }
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: true,
                    text: this.getResourceBundle().getText("representacoes_por_cargo_title"),
                    style: {
                        fontSize: sTitleFontSize
                    }
                }
            });


            //Representações no Mercado
            oVizFrameRepMercado.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.SHORTFLOAT_MFD2,
                        visible: true,
                        showTotal: true
                    },
                    dataShape: {
                        primaryAxis: ["line", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar"]
                    },
                    colorPalette: [
                        "sapUiChartPaletteSemanticNeutralDark2",
                        "sapUiChartPaletteSequentialHue1Light3",
                        "sapUiChartPaletteSequentialHue1Light2",
                        "sapUiChartPaletteSequentialHue1Light1",
                        "sapUiChartPaletteSequentialHue1",
                        "sapUiChartPaletteSequentialHue1Dark1",
                        "sapUiChartPaletteSequentialHue1Dark2",
                        "sapUiChartPaletteSequentialNeutralLight3",
                        "sapUiChartPaletteSequentialNeutralLight2",
                        "sapUiChartPaletteSequentialNeutralLight1",
                        "sapUiChartPaletteSequentialNeutral",
                        "sapUiChartPaletteSequentialNeutralDark1",
                        "sapUiChartPaletteSequentialNeutralDark2"
                    ]
                },
                legendGroup: {
                    layout: {
                        position: "bottom",
                        alignment: "center"
                    }
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: true,
                    text: this.getResourceBundle().getText("representacoes_mercado_title"),
                    style: {
                        fontSize: sTitleFontSize
                    }
                }
            });

            //Comissoes sem Representante
            oVizFrameComissSemRep.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.SHORTFLOAT_MFD2,
                        visible: true,
                        type: "value"
                    },
                    colorPalette: [
                        "sapUiChartPaletteSequentialHue1Light3",
                        "sapUiChartPaletteSequentialHue1Light2",
                        "sapUiChartPaletteSequentialHue1Light1",
                        "sapUiChartPaletteSequentialHue1",
                        "sapUiChartPaletteSequentialHue1Dark1",
                        "sapUiChartPaletteSequentialHue1Dark2",
                        "sapUiChartPaletteSequentialNeutralLight3",
                        "sapUiChartPaletteSequentialNeutralLight2",
                        "sapUiChartPaletteSequentialNeutralLight1",
                        "sapUiChartPaletteSequentialNeutral",
                        "sapUiChartPaletteSequentialNeutralDark1",
                        "sapUiChartPaletteSequentialNeutralDark2"
                    ]
                },
                legendGroup: {
                    layout: {
                        position: "bottom",
                        alignment: "center"
                    }
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: true,
                    text: this.getResourceBundle().getText("comissoes_sem_representante_title"),
                    style: {
                        fontSize: sTitleFontSize
                    }
                }
            });


            //Comissoes Com Representante
            oVizFrameComissComRep.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.SHORTFLOAT_MFD2,
                        visible: true,
                        type: "value",
                        position: 'inside'
                        //showTotal: true
                    },
                    colorPalette: [
                        "sapUiChartPaletteSequentialHue1Light3",
                        "sapUiChartPaletteSequentialHue1Light2",
                        "sapUiChartPaletteSequentialHue1Light1",
                        "sapUiChartPaletteSequentialHue1",
                        "sapUiChartPaletteSequentialHue1Dark1",
                        "sapUiChartPaletteSequentialHue1Dark2",
                        "sapUiChartPaletteSequentialNeutralLight3",
                        "sapUiChartPaletteSequentialNeutralLight2",
                        "sapUiChartPaletteSequentialNeutralLight1",
                        "sapUiChartPaletteSequentialNeutral",
                        "sapUiChartPaletteSequentialNeutralDark1",
                        "sapUiChartPaletteSequentialNeutralDark2"
                    ]
                },
                legendGroup: {
                    layout: {
                        position: "bottom",
                        alignment: "center"
                    }
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: true,
                    text: this.getResourceBundle().getText("comissoes_com_representante_title"),
                    style: {
                        fontSize: sTitleFontSize
                    }
                }
            });

            var oPopOver = this.getView().byId("idPopOver"),
                oPopOverTemasPorCriticidade = this.getView().byId("idPopOverTemasPorCriticidade"),
                oPopOverComissSemRep = this.getView().byId("idPopOverComissSemRep"),
                oPopOverComissComRep = this.getView().byId("idPopOverComissComRep"),
                oPopOverRepMercado = this.getView().byId("idPopOverRepMercado"),
                oPopOverRepPorCargo = this.getView().byId("idPopOverRepPorCargo");

            oPopOver.connect(oVizFrame.getVizUid());
            oPopOver.setFormatString(formatPattern.STANDARDFLOAT);

            oPopOverTemasPorCriticidade.connect(oVizFrameTemasPorCriticidade.getVizUid());
            oPopOverTemasPorCriticidade.setFormatString(formatPattern.STANDARDFLOAT);

            oPopOverComissSemRep.connect(oVizFrameComissSemRep.getVizUid());
            oPopOverComissSemRep.setFormatString(formatPattern.STANDARDFLOAT);

            oPopOverComissComRep.connect(oVizFrameComissComRep.getVizUid());
            oPopOverComissComRep.setFormatString(formatPattern.STANDARDFLOAT);

            oPopOverRepMercado.connect(oVizFrameRepMercado.getVizUid());
            oPopOverRepMercado.setFormatString(formatPattern.STANDARDFLOAT);

            oPopOverRepPorCargo.connect(oVizFrameRepPorCargo.getVizUid());
            oPopOverRepPorCargo.setFormatString(formatPattern.STANDARDFLOAT);


            var aFilter = [],
                odtrPeriodo = this.byId("dtrPeriodo");

            if (odtrPeriodo.getDateValue()) {

                var vMinDate = odtrPeriodo.getDateValue(),
                    vMaxDate = new Date(odtrPeriodo.getSecondDateValue().getFullYear(), odtrPeriodo.getSecondDateValue().getMonth() + 1, 0);
                aFilter.push(new Filter({
                    path: "primeiroRegistro",
                    operator: FilterOperator.BT,
                    value1: vMinDate,
                    value2: vMaxDate
                }));
            } else {

                var vToday = new Date(),
                    vMinDate = new Date(vToday.getFullYear() - 1, vToday.getMonth(), vToday.getDate()),
                    vMaxDate = new Date(vToday.getFullYear(), vToday.getMonth() + 1, 0);


                aFilter.push(new Filter({
                    path: "primeiroRegistro",
                    operator: FilterOperator.BT,
                    value1: vMinDate,
                    value2: vMaxDate
                }));

            }

            this.getTemasPorRegulador(aFilter);
            this.getTemasPorCriticidade(aFilter);

            if (oObjectUser.userLog.userProfile_ID !== "REP") {
                this.getRepresentacoesPorCargo();
                this.getRepresentacoesNoMercado();
                this.getComissoesSemRepresentantePorRegulador();
                this.getComissoesComRepresentantePorRegulador();
            }

        },

        getTemasPorRegulador: function (aFilter) {
            var oModel = this.getModel(),
                that = this,
                aTemasReguladorMes = [],
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/Temas';

            oModel.read(sPath, {
                filters: [aFilter],
                urlParameters: {
                    "$expand": "regulador",
                    "$select": "primeiroRegistro"
                },

                success: function (oData) {
                    var oResults = oData.results;

                    for (let i = 0; i < oResults.length; i++) {
                        const element = oResults[i];
                        element.primeiroRegistro = new Date(element.primeiroRegistro.getFullYear(), element.primeiroRegistro.getMonth(), 1);
                    }

                    var aDates = oResults.filter((tema, index, self) =>
                        index === self.findIndex((t) => (
                            t.primeiroRegistro.toString() === tema.primeiroRegistro.toString() && t.primeiroRegistro.toString() === tema.primeiroRegistro.toString()
                        ))
                    );

                    for (let i = 0; i < aDates.length; i++) {
                        const tema = aDates[i];

                        var aGroupMonth = oResults.filter(r => { return r.primeiroRegistro.toString() === tema.primeiroRegistro.toString() });

                        var oMeasure = {};

                        var aReguladoresMes = aGroupMonth.filter((tema, index, self) =>
                            index === self.findIndex((t) => (
                                t.regulador.descricao === tema.regulador.descricao && t.regulador.descricao === tema.regulador.descricao
                            ))
                        );

                        var sElement = '{ "MESANO": "' + tema.primeiroRegistro + '","',
                            vTotal = 0;

                        for (let z = 0; z < aReguladoresMes.length; z++) {
                            const element = aReguladoresMes[z];

                            var aGroupRegulador = aGroupMonth.filter(r => { return r.regulador.descricao === element.regulador.descricao });
                            vTotal += aGroupRegulador.length;
                            sElement += element.regulador.descricao + '": ' + aGroupRegulador.length;
                            if (z !== aReguladoresMes.length - 1) {
                                sElement += ',"';
                            }

                            aMeasuresConfig.push({ name: element.regulador.descricao, value: '{' + element.regulador.descricao + '}' });

                        }

                        sElement += ',"TOTAL": ' + vTotal + ' }';



                        oMeasure = JSON.parse(sElement);
                        aMeasures.push(oMeasure);

                    }

                    for (let dts = 0; dts < aMeasures.length; dts++) {
                        const element = aMeasures[dts];
                        element.MESANO = new Date(element.MESANO);
                    }

                    var assignedContentData = {
                        AssignedContentData: aMeasures
                    };
                    var oVizFrame = that.getView().byId("idVizFrame"),
                        dataModel = new JSONModel(assignedContentData);

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({ name: "MESANO", value: "{path:'MESANO', type: 'sap.ui.model.type.Date', formatOptions: { pattern : 'MMM/yyyy' } }" });
                    aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });


                    aMeasuresConfig = aMeasuresConfig.filter((measure, index, self) =>
                        index === self.findIndex((t) => (
                            t.name === measure.name && t.name === measure.name
                        ))
                    );

                    oVizFrame.destroyDataset();
                    oVizFrame.destroyFeeds();

                    var oSorter = new sap.ui.model.Sorter("MESANO", false);

                    //New dataset
                    oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                        dimensions: aDimensions,
                        measures: aMeasuresConfig,
                        data: {
                            path: "/AssignedContentData",
                            sorter: oSorter
                        }
                    }));

                    //Add feeds
                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: ["MESANO"]
                    }));

                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: ["TOTAL"]
                    }));


                    for (let ax = 0; ax < aMeasuresConfig.length; ax++) {
                        const element = aMeasuresConfig[ax];

                        if (element.name !== "TOTAL") {
                            oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                                uid: "valueAxis",
                                type: "Measure",
                                values: [element.name]
                            }));
                        }
                    }

                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },


        getTemasPorCriticidade: function (aFilter) {
            var oModel = this.getModel(),
                that = this,
                aTemasReguladorMes = [],
                //aFilter = new Filter([]),
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/Temas';

            oModel.read(sPath, {
                filters: [aFilter],
                urlParameters: {
                    "$expand": "criticidade",
                    "$select": "primeiroRegistro"
                },

                success: function (oData) {
                    var oResults = oData.results;

                    for (let i = 0; i < oResults.length; i++) {
                        const element = oResults[i];
                        element.primeiroRegistro = new Date(element.primeiroRegistro.getFullYear(), element.primeiroRegistro.getMonth(), 1);
                    }

                    var aDates = oResults.filter((tema, index, self) =>
                        index === self.findIndex((t) => (
                            t.primeiroRegistro.toString() === tema.primeiroRegistro.toString() && t.primeiroRegistro.toString() === tema.primeiroRegistro.toString()
                        ))
                    );

                    for (let i = 0; i < aDates.length; i++) {
                        const tema = aDates[i];

                        var aGroupMonth = oResults.filter(r => { return r.primeiroRegistro.toString() === tema.primeiroRegistro.toString() });

                        var oMeasure = {};

                        var aCriticidadeMes = aGroupMonth.filter((tema, index, self) =>
                            index === self.findIndex((t) => (
                                t.criticidade.descricao === tema.criticidade.descricao && t.criticidade.descricao === tema.criticidade.descricao
                            ))
                        );

                        var sElement = '{ "MESANO": "' + tema.primeiroRegistro + '","',
                            vTotal = 0;

                        for (let z = 0; z < aCriticidadeMes.length; z++) {
                            const element = aCriticidadeMes[z];

                            var aGroupCriticidade = aGroupMonth.filter(r => { return r.criticidade.descricao === element.criticidade.descricao });
                            vTotal += aGroupCriticidade.length;
                            sElement += element.criticidade.descricao + '": ' + aGroupCriticidade.length;
                            if (z !== aCriticidadeMes.length - 1) {
                                sElement += ',"';
                            }

                            aMeasuresConfig.push({ name: element.criticidade.descricao, value: '{' + element.criticidade.descricao + '}' });

                        }

                        sElement += ',"TOTAL": ' + vTotal + ' }';



                        oMeasure = JSON.parse(sElement);
                        aMeasures.push(oMeasure);

                    }

                    for (let dts = 0; dts < aMeasures.length; dts++) {
                        const element = aMeasures[dts];
                        element.MESANO = new Date(element.MESANO);
                    }

                    var assignedContentData = {
                        AssignedContentData: aMeasures
                    };
                    var oVizFrame = that.getView().byId("idVizFrameTemasPorCriticidade"),
                        dataModel = new JSONModel(assignedContentData);

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({ name: "MESANO", value: "{path:'MESANO', type: 'sap.ui.model.type.Date', formatOptions: { pattern : 'MMM/yyyy' } }" });
                    aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });


                    aMeasuresConfig = aMeasuresConfig.filter((measure, index, self) =>
                        index === self.findIndex((t) => (
                            t.name === measure.name && t.name === measure.name
                        ))
                    );

                    oVizFrame.destroyDataset();
                    oVizFrame.destroyFeeds();

                    var oSorter = new sap.ui.model.Sorter("MESANO", false);

                    //New dataset
                    oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                        dimensions: aDimensions,
                        measures: aMeasuresConfig,
                        data: {
                            path: "/AssignedContentData",
                            sorter: oSorter
                        }
                    }));

                    //Add feeds
                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: ["MESANO"]
                    }));

                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: ["TOTAL"]
                    }));


                    for (let ax = 0; ax < aMeasuresConfig.length; ax++) {
                        const element = aMeasuresConfig[ax];

                        if (element.name !== "TOTAL") {
                            oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                                uid: "valueAxis",
                                type: "Measure",
                                values: [element.name]
                            }));
                        }
                    }


                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },

        getRepresentacoesPorCargo: function () {
            var oModel = this.getModel(),
                that = this,
                aTemasReguladorMes = [],
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/representacoesPorCargo()';

            oModel.read(sPath, {
                success: function (oData) {

                    var oResults = oData.results;

                    var aReguladores = oResults.filter((repPorCargo, index, self) =>
                        index === self.findIndex((t) => (
                            t.regulador === repPorCargo.regulador && t.regulador === repPorCargo.regulador
                        ))
                    );

                    for (let i = 0; i < aReguladores.length; i++) {
                        const reg = aReguladores[i];

                        var aGroupRegulador = oResults.filter(r => { return r.regulador === reg.regulador });

                        var oMeasure = {};

                        var aCargosPorRegulador = aGroupRegulador.filter((grpReg, index, self) =>
                            index === self.findIndex((t) => (
                                t.cargo === grpReg.cargo && t.cargo === grpReg.cargo
                            ))
                        );

                        var sElement = '{ "REGULADOR": "' + reg.regulador + '","',
                            vTotal = 0;

                        for (let z = 0; z < aCargosPorRegulador.length; z++) {
                            const element = aCargosPorRegulador[z];

                            var aGroupCargos = aGroupRegulador.filter(r => { return r.cargo === element.cargo });
                            vTotal += aGroupCargos.length;
                            sElement += element.cargo + '": ' + aGroupCargos.length;
                            if (z !== aCargosPorRegulador.length - 1) {
                                sElement += ',"';
                            }

                            aMeasuresConfig.push({ name: element.cargo, value: '{' + element.cargo + '}' });

                        }

                        sElement += ',"TOTAL": ' + vTotal + ' }';



                        oMeasure = JSON.parse(sElement);
                        aMeasures.push(oMeasure);

                    }

                    var assignedContentData = {
                        RepresentacoesPorCargo: aMeasures
                    };
                    var oVizFrame = that.getView().byId("idVizFrameRepPorCargo"),
                        dataModel = new JSONModel(assignedContentData);

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({ name: "REGULADOR", value: "{REGULADOR}" });
                    aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });


                    aMeasuresConfig = aMeasuresConfig.filter((measure, index, self) =>
                        index === self.findIndex((t) => (
                            t.name === measure.name && t.name === measure.name
                        ))
                    );

                    oVizFrame.destroyDataset();
                    oVizFrame.destroyFeeds();

                    var oSorter = new sap.ui.model.Sorter("REGULADOR", false);

                    //New dataset
                    oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                        dimensions: aDimensions,
                        measures: aMeasuresConfig,
                        data: {
                            path: "/RepresentacoesPorCargo",
                            sorter: oSorter
                        }
                    }));

                    //Add feeds
                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: ["REGULADOR"]
                    }));

                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: ["TOTAL"]
                    }));


                    for (let ax = 0; ax < aMeasuresConfig.length; ax++) {
                        const element = aMeasuresConfig[ax];

                        if (element.name !== "TOTAL") {
                            oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                                uid: "valueAxis",
                                type: "Measure",
                                values: [element.name]
                            }));
                        }
                    }


                    that.hideBusy();

                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },


        getRepresentacoesNoMercado: function () {
            var oModel = this.getModel(),
                that = this,
                aTemasReguladorMes = [],
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/representacoesMercado()';

            oModel.read(sPath, {
                success: function (oData) {
                    var oResults = oData.results,
                        sSemRegulador = that.getResourceBundle().getText("sem_regulador_txt");

                    var aReguladores = oResults.filter((comissao, index, self) =>
                        index === self.findIndex((t) => (
                            t.regulador === comissao.regulador && t.regulador === comissao.regulador
                        ))
                    );

                    for (let i = 0; i < aReguladores.length; i++) {
                        const reg = aReguladores[i];

                        var aGroupRegulador = oResults.filter(r => { return r.regulador === reg.regulador });

                        var aQtdComIndicacao = aGroupRegulador.filter(regC => { return regC.comIndicacao }),
                            aQtdSemIndicacao = aGroupRegulador.filter(regS => { return !regS.comIndicacao });

                        var oMeasure = {};

                        var sElement = '{ "REGULADOR": "' + reg.regulador + '","',
                            vTotal = 0;

                        vTotal = aQtdComIndicacao.length + aQtdSemIndicacao.length

                        oMeasure = {
                            REGULADOR: reg.regulador,
                            COM_INDICACAO: aQtdComIndicacao.length,
                            SEM_INDICACAO: aQtdSemIndicacao.length,
                            TOTAL: vTotal
                        };

                        aMeasures.push(oMeasure);

                    }

                    var assignedContentData = {
                        RepresentacoesMercado: aMeasures
                    };
                    var oVizFrame = that.getView().byId("idVizFrameRepMercado"),
                        dataModel = new JSONModel(assignedContentData);

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({ name: "REGULADOR", value: "{REGULADOR}" });
                    aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });

                    var sComIndicacao = that.getResourceBundle().getText("com_indicacao_txt"),
                        sSemIndicacao = that.getResourceBundle().getText("sem_indicacao_txt");

                    aMeasuresConfig.push({ name: sComIndicacao, value: "{COM_INDICACAO}" });
                    aMeasuresConfig.push({ name: sSemIndicacao, value: "{SEM_INDICACAO}" });

                    oVizFrame.destroyDataset();
                    oVizFrame.destroyFeeds();

                    var oSorter = new sap.ui.model.Sorter("REGULADOR", false);

                    //New dataset
                    oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                        dimensions: aDimensions,
                        measures: aMeasuresConfig,
                        data: {
                            path: "/RepresentacoesMercado",
                            sorter: oSorter
                        }
                    }));

                    //Add feeds
                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: ["REGULADOR"]
                    }));

                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: ["TOTAL"]
                    }));


                    for (let ax = 0; ax < aMeasuresConfig.length; ax++) {
                        const element = aMeasuresConfig[ax];

                        if (element.name !== "TOTAL") {
                            oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                                uid: "valueAxis",
                                type: "Measure",
                                values: [element.name]
                            }));
                        }
                    }

                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },

        getComissoesSemRepresentantePorRegulador: function () {
            var oModel = this.getModel(),
                that = this,
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/comissoesSemRepresentante';

            oModel.read(sPath, {
                urlParameters: {
                    "$expand": "regulador"
                },

                success: function (oData) {
                    var oResults = oData.results,
                        sSemRegulador = that.getResourceBundle().getText("sem_regulador_txt");

                    var aReguladores = oResults.filter((comissao, index, self) =>
                        index === self.findIndex((t) => (
                            t.regulador === comissao.regulador && t.regulador === comissao.regulador
                        ))
                    );

                    for (let i = 0; i < aReguladores.length; i++) {
                        const regulador = aReguladores[i];

                        var aComissoesRegulador = oResults.filter(r => { return r.regulador === regulador.regulador });

                        if (regulador.regulador) {
                            aMeasures.push({ REGULADOR: regulador.regulador.descricao, TOTAL: aComissoesRegulador.length });
                        } else {
                            aMeasures.push({ REGULADOR: sSemRegulador, TOTAL: aComissoesRegulador.length });
                        }


                    }

                    var assignedContentData = {
                        ComissoesSemRepresentante: aMeasures
                    };
                    var oVizFrame = that.getView().byId("idVizFrameComissSemRep"),
                        dataModel = new JSONModel(assignedContentData);

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({ name: "REGULADOR", value: "{REGULADOR}" });
                    aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });

                    oVizFrame.destroyDataset();
                    oVizFrame.destroyFeeds();

                    //New dataset
                    oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                        dimensions: aDimensions,
                        measures: aMeasuresConfig,
                        data: {
                            path: "/ComissoesSemRepresentante"
                        }
                    }));

                    //Add feeds
                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "color",
                        type: "Dimension",
                        values: ["REGULADOR"]
                    }));

                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "size",
                        type: "Measure",
                        values: ["TOTAL"]
                    }));

                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },

        getComissoesComRepresentantePorRegulador: function () {
            var oModel = this.getModel(),
                that = this,
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/comissoesComRepresentante';

            oModel.read(sPath, {
                urlParameters: {
                    "$expand": "regulador"
                },

                success: function (oData) {
                    var oResults = oData.results;

                    var aReguladores = oResults.filter((comissao, index, self) =>
                        index === self.findIndex((t) => (
                            t.regulador === comissao.regulador && t.regulador === comissao.regulador
                        ))
                    );

                    for (let i = 0; i < aReguladores.length; i++) {
                        const regulador = aReguladores[i];

                        var aComissoesRegulador = oResults.filter(r => { return r.regulador.descricao === regulador.regulador.descricao });

                        if (regulador.regulador) {
                            aMeasures.push({ REGULADOR: regulador.regulador.descricao, TOTAL: aComissoesRegulador.length });
                        } else {
                            aMeasures.push({ REGULADOR: regulador.regulador, TOTAL: aComissoesRegulador.length });
                        }


                    }

                    var assignedContentData = {
                        ComissoesComRepresentante: aMeasures
                    };
                    var oVizFrame = that.getView().byId("idVizFrameComissComRep"),
                        dataModel = new JSONModel(assignedContentData);

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({ name: "REGULADOR", value: "{REGULADOR}" });
                    aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });

                    oVizFrame.destroyDataset();
                    oVizFrame.destroyFeeds();

                    //New dataset
                    oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                        dimensions: aDimensions,
                        measures: aMeasuresConfig,
                        data: {
                            path: "/ComissoesComRepresentante"
                        }
                    }));

                    //Add feeds
                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "color",
                        type: "Dimension",
                        values: ["REGULADOR"]
                    }));

                    oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "size",
                        type: "Measure",
                        values: ["TOTAL"]
                    }));

                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },

        //EXPORT EXCEL
        createColumnConfig: function (aSelectedColumns) {
            var aCols = [],
                oI18n = this.getResourceBundle();


            for (let i = 0; i < aSelectedColumns.length; i++) {
                const field = aSelectedColumns[i];

                switch (field) {
                    case 0:
                        aCols.push({
                            label: oI18n.getText("representante_txt"),
                            property: 'representante/nome',
                            type: EdmType.String
                        });
                        break;
                    case 1:
                        aCols.push({
                            label: oI18n.getText("regulador_txt"),
                            type: EdmType.String,
                            property: 'regulador/descricao'
                        });
                        break;

                    case 2:
                        aCols.push({
                            label: oI18n.getText("comissao_short_txt"),
                            type: EdmType.String,
                            property: 'comissao/descricao'
                        });

                        break;

                    case 3:
                        aCols.push({
                            label: oI18n.getText("tema_txt"),
                            type: EdmType.String,
                            property: 'descricao'
                        });

                        break;

                    case 4:
                        aCols.push({
                            label: oI18n.getText("ultimo_registro_txt"),
                            type: EdmType.Date,
                            property: 'ultimoRegistro'
                        });

                        break;

                    case 5:
                        aCols.push({
                            label: oI18n.getText("primeiro_registro_txt"),
                            type: EdmType.Date,
                            property: 'primeiroRegistro'
                        });

                        break;
                    case 6:
                        aCols.push({
                            label: oI18n.getText("criticidade_txt"),
                            type: EdmType.String,
                            property: 'criticidade/descricao'
                        });
                        break;

                    case 7:
                        aCols.push({
                            label: oI18n.getText("status_txt"),
                            type: EdmType.String,
                            property: 'status/descricao'
                        });

                        break;

                    case 8:
                        aCols.push({
                            label: oI18n.getText("data_ultima_reuniao_txt"),
                            type: EdmType.Date,
                            property: 'dataUltimaReuniao'
                        });
                        break;

                    case 9:
                        aCols.push({
                            label: oI18n.getText("detalhamento_discussao_txt"),
                            type: EdmType.String,
                            property: 'detalheDiscussao'
                        });
                        break;

                    case 10:
                        aCols.push({
                            label: oI18n.getText("diretor_executivo_txt"),
                            type: EdmType.String,
                            property: 'diretorExecutivo'
                        });
                        break;

                    case 11:
                        aCols.push({
                            label: oI18n.getText("diretor_geral_txt"),
                            type: EdmType.String,
                            property: 'diretorGeral'
                        });
                        break;

                    case 12:
                        aCols.push({
                            label: oI18n.getText("principais_impactos_txt"),
                            type: EdmType.String,
                            property: 'principaisImpactos'
                        });
                        break;

                    default:

                        aCols.push({
                            label: oI18n.getText("representante_txt"),
                            property: 'representante/nome',
                            type: EdmType.String
                        });

                        aCols.push({
                            label: oI18n.getText("regulador_txt"),
                            type: EdmType.String,
                            property: 'regulador/descricao'
                        });

                        aCols.push({
                            label: oI18n.getText("comissao_short_txt"),
                            type: EdmType.String,
                            property: 'comissao/descricao'
                        });

                        aCols.push({
                            label: oI18n.getText("tema_txt"),
                            type: EdmType.String,
                            property: 'descricao'
                        });

                        aCols.push({
                            label: oI18n.getText("ultimo_registro_txt"),
                            type: EdmType.Date,
                            property: 'ultimoRegistro'
                        });


                        aCols.push({
                            label: oI18n.getText("criticidade_txt"),
                            type: EdmType.String,
                            property: 'criticidade/descricao'
                        });

                        aCols.push({
                            label: oI18n.getText("status_txt"),
                            type: EdmType.String,
                            property: 'status/descricao'
                        });

                        break;
                }
            }

            return aCols;
        },

        onExport: function () {
            var sFragment = "ps.uiRepMercado.view.fragments.ExportTemas";

            this.getModel("ExportModel").refresh();
            if (!this._oDialogSelectTemaFields) {
                this._oDialogSelectTemaFields = sap.ui.xmlfragment(sFragment, this);
                this.getView().addDependent(this._oDialogSelectTemaFields);
            }
            this._oDialogSelectTemaFields.open();

        },

        _onSearchFieldNames: function (oEvent) {
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
                this._oTable = this.byId('tblTemas');
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
                        sheetName: 'Temas'
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
                fileName: 'Temas.xlsx'//,
                //worker: false // We need to disable worker because we are using a MockServer as OData Service
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        _validateField: function (fieldName) {

            var oControl = sap.ui.getCore().byId(fieldName);//this.getView().byId(fieldName);
            var value;

            if (fieldName.substring(0, 3) === "cmb") {
                value = oControl.getSelectedKey();
                if (value === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(this.geti18nText("campo_obrigatorio_txt"));
                    sap.m.MessageToast.show(this.geti18nText("campo_obrigatorio_msg"));
                    return false;
                }
            } else {
                value = oControl.getValue();
                if (value === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(this.geti18nText("campo_obrigatorio_txt"));
                    sap.m.MessageToast.show(this.geti18nText("campo_obrigatorio_msg"));
                    return false;
                }
            }
            oControl.setValueState("None");
            return true;
        },

        validaInformacoesAlerta: function () {

            var isValid = true;

            if (!this._validateField("dtInicio"))
                isValid = false;

            //cmbTipoAlerta
            if (!this._validateField("cmbTipoAlerta"))
                isValid = false;

            if (!this._validateField("txtDescricaoAlerta"))
                isValid = false;

            return isValid;
        },

        ///CALENDARIO 
        openDialogRepresentanteAlerta: function (oEvent) {

            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                that = this;
            this.oDialogUsuariosAlerta = this.getDialogUsuariosAlerta("ps.uiRepMercado.view.fragments.UsuariosAlerta");

            oModel.read("/Usuarios", {

                success: function (oData) {

                    var oUsuariosAlertaModel = new JSONModel(oData);
                    oView.setModel(oUsuariosAlertaModel, "usuariosAlertaModel");
                    that._oDialogUsuariosAlerta.open();
                },
                error: function (oError) {

                    oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                }

            });

        },

        getDialogUsuariosAlerta: function (sFragment) {
            if (!this._oDialogUsuariosAlerta) {
                this._oDialogUsuariosAlerta = sap.ui.xmlfragment(sFragment, this);
                this.getView().addDependent(this._oDialogUsuariosAlerta);
            }

            return this._oDialogUsuariosAlerta;
        },

        _onSearchUsuariosAlerta: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "nome",
                FilterOperator.Contains,
                sValue
            );
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        _onDefineUsuariosAlertaPress: function (oEvent) {

            var aSelectedItems = oEvent.getParameter("selectedContexts"),
                oMultiInput = sap.ui.getCore().byId("inpRepresentantesAlerta");

            if (aSelectedItems && aSelectedItems.length > 0) {
                aSelectedItems.forEach(function (oItem) {
                    oMultiInput.addToken(new sap.m.Token({
                        key: oItem.getObject().ID,
                        text: oItem.getObject().nome
                    }));
                });
            }

        },


        onNewAppointment: function (oEvent) {

            var oParams = this.getTemplateNewAppointment();
            var oEditAlertaModel = new JSONModel(oParams),
                oDtInicio = sap.ui.getCore().byId("dtInicio"),
                btnExluirAlerta = sap.ui.getCore().byId("btnExluirAlerta"),
                mtCBoxStatusAlerta = sap.ui.getCore().byId("mtCBoxStatusAlerta"),
                mtCBoxPerfisAlerta = sap.ui.getCore().byId("mtCBoxPerfisAlerta"),
                oMultiInput = sap.ui.getCore().byId("inpRepresentantesAlerta");

            oDtInicio.setMinDate(new Date());
            oDtInicio.setDateValue(new Date());
            btnExluirAlerta.setEnabled(false);
            mtCBoxStatusAlerta.setSelectedKeys([]);
            mtCBoxPerfisAlerta.setSelectedKeys([]);
            oMultiInput.destroyTokens();

            this.getView().setModel(oEditAlertaModel, "EditAlertaModel");
            this._oDialogDetalhesAlerta.open();
        },

        getTemplateNewAppointment: function () {
            var oUser = this.getModel("userLogModel").getData(),
                opcAlertas = this.byId("pcAlertas");


            var oParams = {
                ID: "",
                usuario_ID: oUser.userLog.ID,
                eventos: [],
                dtInicio: new Date(),
                alertaPessoal: true,
                editable: true
            },
                oEvento = {
                    ID: "",
                    descricao: "",
                    dtInicio: new Date(),
                    dtFim: new Date(),
                    tipo: "Type06",
                    conteudo: "",
                    enviaEmail: false,
                    tentative: false,
                    concluido: false,
                    alertaPessoal: true,
                    tipoAlerta_ID: "",
                    alertaUsuario_ID: ""
                };

            var oBindingRows = opcAlertas.getBindingInfo("rows");

            if (oBindingRows) {
                var oContexts = oBindingRows.binding.getContexts();
                if (oContexts) {
                    var oCalndarioUser = oContexts[0].getObject();
                    oParams.ID = oCalndarioUser.ID;
                    oEvento.alertaUsuario_ID = oCalndarioUser.ID;
                }
            }

            oParams.eventos.push(oEvento);

            return oParams;
        },

        handleAppointmentSelect: function (oEvent) {
            var oAppointment = oEvent.getParameter("appointment"),
                oUser = this.getModel("userLogModel").getData();
            /* bSelected,
             aAppointments,
             sValue;*/
            if (oAppointment) {
                //bSelected = oAppointment.getSelected();
                var oBingingContext = oAppointment.getBindingContext(),
                    oSelPath = oBingingContext.getPath(),
                    oSelectedAppintment = this.getModel().getObject(oSelPath),                    
                    oDtInicio = sap.ui.getCore().byId("dtInicio"),
                    btnExluirAlerta = sap.ui.getCore().byId("btnExluirAlerta"),
                    mtCBoxStatusAlerta = sap.ui.getCore().byId("mtCBoxStatusAlerta"),
                    mtCBoxPerfisAlerta = sap.ui.getCore().byId("mtCBoxPerfisAlerta"),
                    oMultiInput = sap.ui.getCore().byId("inpRepresentantesAlerta");

                    oSelectedAppintment.editable = true;
              

                btnExluirAlerta.setEnabled(true);
                oDtInicio.setMinDate(new Date());
                mtCBoxStatusAlerta.setSelectedKeys([]);
                mtCBoxPerfisAlerta.setSelectedKeys([]);
                oMultiInput.destroyTokens();

                if (oSelectedAppintment.statusTemas && oSelectedAppintment.statusTemas !== "") {
                    var aSelectedKeys = oSelectedAppintment.statusTemas.split("|");
                    if (aSelectedKeys && aSelectedKeys.length > 0) {
                        mtCBoxStatusAlerta.setSelectedKeys(aSelectedKeys);
                    }
                }

                if (oSelectedAppintment.perfisQueRecebem && oSelectedAppintment.perfisQueRecebem !== "") {
                    var aSelectedPerfilKeys = oSelectedAppintment.perfisQueRecebem.split("|");
                    if (aSelectedPerfilKeys && aSelectedPerfilKeys.length > 0) {
                        mtCBoxPerfisAlerta.setSelectedKeys(aSelectedPerfilKeys);
                    }
                }

                if (oSelectedAppintment.usuariosQueRecebem && oSelectedAppintment.usuariosQueRecebem !== "") {
                    var aSelectedUsersKeys = oSelectedAppintment.usuariosQueRecebem.split("|");
                    for (let i = 0; i < aSelectedUsersKeys.length; i++) {
                        const element = aSelectedUsersKeys[i];
                        var oUserData = this.getModel().getData("/Usuarios('" + element + "')");
                        oMultiInput.addToken(new sap.m.Token({
                            key: oUserData.ID,
                            text: oUserData.nome
                        }));
                    }

                }

                if (oSelectedAppintment.eventoOrigem_ID) {                   
                    oSelectedAppintment.editable = false;
                     btnExluirAlerta.setEnabled(false);
                   if (oUser.userLog.userProfile_ID === "ADM") {
                      oSelectedAppintment.editable = true;
                   } 
                }

                var oEditAlertaModel = new JSONModel(oSelectedAppintment);
                this.getView().setModel(oEditAlertaModel, "EditAlertaModel");

                this._oDialogDetalhesAlerta.open();
            }
        },       

        onSaveAlertaButtonPress: function (oEvent) {
            if (this.validaInformacoesAlerta()) {
                var oRTextEditor = sap.ui.getCore().byId("RTextEditor"),
                    mtCBoxStatusAlerta = sap.ui.getCore().byId("mtCBoxStatusAlerta"),
                    mtCBoxPerfisAlerta = sap.ui.getCore().byId("mtCBoxPerfisAlerta"),
                    oMultiInput = sap.ui.getCore().byId("inpRepresentantesAlerta"),
                    oEditAlertaModel = this.getView().getModel("EditAlertaModel"),
                    oModelData = oEditAlertaModel.getData(),
                    oCalendario = {
                        ID: oModelData.alertaUsuario_ID ? oModelData.alertaUsuario_ID : oModelData.ID,
                        usuario_ID: oModelData.usuario_ID ? oModelData.usuario_ID : "",
                        eventos: []
                    },
                    oEvento = {
                        ID: oModelData.alertaUsuario_ID ? oModelData.ID : "",
                        descricao: oModelData.descricao,
                        dtInicio: oModelData.dtInicio,
                        dtFim: oModelData.dtFim,
                        tipo: "Type06",
                        conteudo: oModelData.conteudo,
                        enviaEmail: oModelData.enviaEmail,
                        tentative: false,
                        concluido: false,
                        alertaPessoal: oModelData.alertaPessoal,
                        tipoAlerta_ID: oModelData.tipoAlerta_ID,
                        alertaUsuario_ID: oModelData.alertaUsuario_ID ? oModelData.alertaUsuario_ID : oModelData.ID

                    },
                    entitySet = "/AlertasUsuario";//EventosAlerta

                //Datas
                var dtInicio = sap.ui.getCore().byId("dtInicio").getDateValue();

                if (!dtInicio) {
                    var sdtInicio = sap.ui.getCore().byId("dtInicio").getValue();
                    sdtInicio = sdtInicio.trim();
                    if (sdtInicio) {
                        dataUltimaReuniao = new Date(sdtInicio.substring(3, 5) + "/" +
                            sdtInicio.substring(0, 2) + "/" +
                            sdtInicio.substring(6, 10)
                        );
                    }
                }

                oEvento.dtInicio = dtInicio;
                oEvento.dtInicio = new Date(oEvento.dtInicio.setHours(8));
                oEvento.dtFim = dtInicio;
                oEvento.dtFim = new Date(oEvento.dtFim.setHours(18));

                //Status Tema
                var oSelKeysStatus = mtCBoxStatusAlerta.getSelectedKeys();
                if (oSelKeysStatus.length > 0) {
                    oEvento.statusTemas = oSelKeysStatus.join('|');
                }

                if (!oEvento.alertaPessoal) {

                    oEvento.usuariosQueRecebem = "";
                    oEvento.perfisQueRecebem = "";

                    //Perfis que recebem o Alerta
                    var oSelKeysPerfis = mtCBoxPerfisAlerta.getSelectedKeys();
                    if (oSelKeysPerfis.length > 0) {
                        oEvento.perfisQueRecebem = oSelKeysPerfis.join('|');
                    }
                    //Usuarios que recebem o Alerta
                    var oSelKeysUsuarios = oMultiInput.getTokens().map(tx => tx.getProperty("key"));
                    if (oSelKeysUsuarios.length > 0) {
                        oEvento.usuariosQueRecebem = oSelKeysUsuarios.join('|');
                    }
                   
                }

                oCalendario.eventos.push(oEvento);

                if (oCalendario.ID === "") {
                    //Novo Calendario e Alerta
                    this.sendCreateCalendarioRequest(entitySet, oCalendario, oEvento);
                }
                else {
                    if (oEvento.ID === "") {
                        //Possui um calendário mas ainda não possui alertas, cria alerta no calendario do usuario 
                        var sEntitySet = "/EventosAlerta";
                        this.sendCreateEventoRequest(sEntitySet, oEvento);
                    } else {
                        //Atualiza Alerta
                        entitySet = "/EventosAlerta(guid'" + oEvento.ID + "')";
                        this.sendUpdateAlertaRequest(entitySet, oEvento);
                    }

                }
            }


        },

        onDeleteAlertaButtonPress: function (oEvent) {
            var sMessage = this.getResourceBundle().getText("confirma_exclusao_alerta_txt"),
                oEditAlertaModel = this.getView().getModel("EditAlertaModel"),
                oModelData = oEditAlertaModel.getData(),
                sIdEvento = oModelData.ID,
                that = this;

            if (sIdEvento && sIdEvento !== "") {

                MessageBox.warning(
                    sMessage,
                    {
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        onClose: function (sAction) {
                            if (sAction === MessageBox.Action.YES) {
                                that.sendDeleteEvento(sIdEvento);
                            }
                        }
                    });

            }

        },

        onCancelAlerta: function () {
            this._oDialogDetalhesAlerta.close();
        },

        sendCreateCalendarioRequest: function (entitySet, oParams, oEvent) {

            var oModel = this.getModel(),
                that = this,
                oEvento = oEvent;

            delete oParams.ID;
            delete oParams.eventos;
            delete oParams.dtInicio;
            delete oParams.alertaPessoal;

            oModel.create(entitySet, oParams, {
                success: function (oData) {

                    oParams.ID = oData.ID;
                    oEvent.alertaUsuario_ID = oData.ID;
                    var sEntitySet = "/EventosAlerta";
                    that.sendCreateEventoRequest(sEntitySet, oEvento);

                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_alerta"));
                    oModel.refresh();
                }
            });
        },

        sendCreateEventoRequest: function (entitySet, oEvent) {

            var oModel = this.getModel(),
                that = this;

            delete oEvent.ID;

            oModel.create(entitySet, oEvent, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_alerta"));
                    oEvent.ID = oData.ID;

                    that.replicaEventoAlertaRequest({idEvento: oData.ID,  perfisQueRecebem: oData.perfisQueRecebem, usuariosQueRecebem: oData.usuariosQueRecebem, bCreate: true });

                    that.onCancelAlerta();
                    oModel.refresh();
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_alerta"));
                    oModel.refresh();
                }
            });
        },

        replicaEventoAlertaRequest: function(oParams){
         
              var oModel = this.getModel(),
                sEntitySet = "/replicaEventoAlerta";
            

            oModel.create(sEntitySet, oParams, {
                success: function (oData) {

                },
                error: function (oError) {
                  
                }
            });


        },

        replicaAlteracaoEventoRequest: function(oParams){
         
              var oModel = this.getModel(),
                sEntitySet = "/replicaEventoAlerta";
            

            oModel.create(sEntitySet, oParams, {
                success: function (oData) {

                },
                error: function (oError) {
                  
                }
            });


        },


        sendUpdateAlertaRequest: function (entitySet, oParams) {

            var oModel = this.getModel(),
                that = this;

            oModel.update(entitySet, oParams, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_alerta"));
                    that.replicaAlteracaoEventoRequest({idEvento: oData.ID,  perfisQueRecebem: oData.perfisQueRecebem, usuariosQueRecebem: oData.usuariosQueRecebem,  bCreate: false });
                    oModel.refresh();
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_alerta"));
                    oModel.refresh();
                }
            });

        },

        sendDeleteEvento: function (sIdEvento) {

            var oModel = this.getModel(),
                entitySet = "/EventosAlerta(guid'" + sIdEvento + "')",
                that = this;

            oModel.remove(entitySet, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_excluir_alerta"));
                    oModel.refresh();
                    that._oDialogDetalhesAlerta.close();

                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_excluir_alerta"));
                    oModel.refresh();
                }
            });
        }


    });
});