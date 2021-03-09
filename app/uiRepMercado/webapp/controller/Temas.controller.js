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

            //Filtros Iniciais
            var //oDPRepPorCargo = this.byId("DPRepPorCargo"),
                oDPTemasPorRegCritic = this.byId("DPTemasPorRegCritic"),
                oDPCompComTemas = this.byId("DPCompComTemas");

            //oDPRepPorCargo.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            //oDPRepPorCargo.setDateValue(vToday);

            oDPTemasPorRegCritic.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));

            oDPCompComTemas.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            oDPCompComTemas.setDateValue(vToday);

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
                        sMessage, {
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
            
            if (bValid) {
                oEventSource.setValueState("None");
                btnFiltrar.setEnabled(true);
            } else {
                oEventSource.setValueState("Error");
                btnFiltrar.setEnabled(false);
            }
        },

        handleChange: function (oEvent) {
            var oDP = oEvent.getSource(),
                //sValue = oEvent.getParameter("value"),
                bValid = oEvent.getParameter("valid");

            if (bValid) {
                oDP.setValueState("None");
            } else {
                oDP.setValueState("Error");
            }
        },

        onAddMesesTemasPorRegCritic: function (oEvent) {

            var ofilterModel = this.getModel("filterModel"),
                oFilterDashBoard = ofilterModel.getProperty("/dashBoard");

            var oDPTemasPorRegCritic = this.byId("DPTemasPorRegCritic");

            if (oDPTemasPorRegCritic.getDateValue()) {

                oFilterDashBoard.selectedDates.push({
                    Date: oDPTemasPorRegCritic.getDateValue()
                });
                oDPTemasPorRegCritic.setValue("");
                ofilterModel.refresh();
            }
        },

        onClearMesesTemasPorRegCritic: function () {
            var ofilterModel = this.getModel("filterModel"),
                oFilterDashBoard = ofilterModel.getProperty("/dashBoard");
            oFilterDashBoard.selectedDates = ([]);
            ofilterModel.refresh();
        },

        onSearchDashBoard: function (oEvent) {
            this._bindChart();
        },

        onClearDashBoardFilter: function () {

            var odtrPeriodo = this.byId("dtrPeriodo"),
                oDPCompComTemas = this.byId("DPCompComTemas"),
               // oDPRepPorCargo = this.byId("DPRepPorCargo"),
                vToday = new Date();

            var ofilterModel = this.getModel("filterModel"),
                oFilterDashBoard = ofilterModel.getProperty("/dashBoard");
            oFilterDashBoard.selectedDates = ([]);
            oFilterDashBoard.porPeriodo = true;
            ofilterModel.refresh();

            odtrPeriodo.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            odtrPeriodo.setDateValue(new Date(vToday.getFullYear() - 1, vToday.getMonth(), vToday.getDate()));
            odtrPeriodo.setSecondDateValue(vToday);            

            /*oDPRepPorCargo.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            oDPRepPorCargo.setDateValue(vToday);*/

            oDPCompComTemas.setMaxDate(new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate()));
            oDPCompComTemas.setDateValue(vToday);

            this._bindChart();
        },

        setVizProperties: function (oVizControl, sTitle, sTitleFontSize, bSingleColor, isLegendVisible, categoryAxisTitleVisible, categoryAxisTitle) {
            sap.viz.ui5.api.env.Format.numericFormatter(ChartFormatter.getInstance());
            var formatPattern = ChartFormatter.DefaultPattern;
            var aPrimaryAxisColum = ["bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar", "bar"],
                aColorPalette = [
                    //"sapUiChartPaletteSemanticNeutralDark2",
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
                ],
                aSingleColorPalette = ["sapUiChartPaletteSequentialHue1Dark2"];

            oVizControl.setVizProperties({
                plotArea: {
                    dataLabel: {
                        formatString: formatPattern.STANDARDINTEGER, //SHORTFLOAT_MFD2,
                        visible: true,
                        showTotal: true,
                        type: "value",
                        overlapBehavior: "hideOverlappedLabels"
                        /*,
                                                renderer: function(oConfig){
                                                    if(oConfig.val === 1){
                                                        oConfig.text = "1";
                                                    }
                                                } */
                    },
                    dataShape: {
                        primaryAxis: aPrimaryAxisColum
                    },
                    colorPalette: bSingleColor ? aSingleColorPalette : aColorPalette
                },
                legendGroup: {
                    layout: {
                        position: "bottom",
                        alignment: "center"                        
                    }
                },
                legend: {
                    visible: isLegendVisible
                },
                valueAxis: {
                    label: {
                        formatString: formatPattern.SHORTINTEGER //SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                valueAxis2: {
                    label: {
                        formatString: formatPattern.SHORTINTEGER //SHORTFLOAT
                    },
                    title: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        text: categoryAxisTitle,
                        visible: categoryAxisTitleVisible
                    }
                },
                title: {
                    visible: false/*,
                    text: sTitle,
                    style: {
                        fontSize: sTitleFontSize
                    }*/
                }
            });
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
                oVizFrameCompComTemas = this.getView().byId("idVizFrameCompComTemas"),
                oVizFrameRepPorCargo = this.getView().byId("idVizFrameRepPorCargo"),
                ofilterModel = this.getModel("filterModel");

            var sCargoLegenda = this.getResourceBundle().getText("representacoes_por_cargo_legenda");
            this.showBusy();
            //Comissoes sem Representante
            this.setVizProperties(oVizFrameComissSemRep, this.getResourceBundle().getText("comissoes_sem_representante_title"), sTitleFontSize, false, true,false,"");
            //Comissoes Com Representante
            this.setVizProperties(oVizFrameComissComRep, this.getResourceBundle().getText("comissoes_com_representante_title"), sTitleFontSize, false, true,false,"");
            //Indicações/representantes por Cargo
            this.setVizProperties(oVizFrameRepPorCargo, this.getResourceBundle().getText("representacoes_por_cargo_title"), sTitleFontSize, false, false,false, sCargoLegenda);
            //Temas Por Regulador
            this.setVizProperties(oVizFrame, this.getResourceBundle().getText("temas_por_reguladores_title"), sTitleFontSize, false, true,false,"");
            //Temas por Criticidade
            this.setVizProperties(oVizFrameTemasPorCriticidade, this.getResourceBundle().getText("temas_por_criticidade_title"), sTitleFontSize, false, true,false,"");
            //Comparativo com Temas 
            this.setVizProperties(oVizFrameCompComTemas, this.getResourceBundle().getText("comparativos_com_temas_title"), sTitleFontSize, true, false,false,"");


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

            oPopOverRepMercado.connect(oVizFrameCompComTemas.getVizUid());
            oPopOverRepMercado.setFormatString(formatPattern.STANDARDFLOAT);

            oPopOverRepPorCargo.connect(oVizFrameRepPorCargo.getVizUid());
            oPopOverRepPorCargo.setFormatString(formatPattern.STANDARDFLOAT);


            //Filters
            var aFilter = [],
                aRepPorCargoFilter = [],
                aComparativosTemaFilter = [],
                odtrPeriodo = this.byId("dtrPeriodo"),
                oDPCompComTemas = this.byId("DPCompComTemas"),
                //oDPRepPorCargo = this.byId("DPRepPorCargo"),
                vToday = new Date();

            var oDashBoardFilter = ofilterModel.getProperty("/dashBoard");

            if (oDashBoardFilter.porPeriodo) {

                if (odtrPeriodo.getDateValue()) {

                    var vMinDate = odtrPeriodo.getDateValue(),
                        vMaxDate = new Date(odtrPeriodo.getSecondDateValue().getFullYear(), odtrPeriodo.getSecondDateValue().getMonth() + 1, 0);
                    aFilter.push(new Filter({
                        path: "ultimoRegistro",
                        operator: FilterOperator.BT,
                        value1: vMinDate,
                        value2: vMaxDate
                    }));
                } else {

                    var vMinDate = new Date(vToday.getFullYear() - 1, vToday.getMonth(), 1),
                        vMaxDate = new Date(vToday.getFullYear(), vToday.getMonth() + 1, 0);

                    aFilter.push(new Filter({
                        path: "ultimoRegistro",
                        operator: FilterOperator.BT,
                        value1: vMinDate,
                        value2: vMaxDate
                    }));


                }

            } else {
                //Filtro Por Meses Selecionados
                var aSelDates = oDashBoardFilter.selectedDates;
                if (aSelDates.length > 0) {
                    for (let index = 0; index < aSelDates.length; index++) {
                        const oDate = aSelDates[index].Date;

                        var vMinDate = new Date(oDate.getFullYear(), oDate.getMonth(), 1),
                            vMaxDate = new Date(oDate.getFullYear(), oDate.getMonth() + 1, 0);

                        aFilter.push(new Filter({
                            path: "ultimoRegistro",
                            operator: FilterOperator.BT,
                            value1: vMinDate,
                            value2: vMaxDate
                        }));


                    }
                }
            }


            //Filtros Representações Por Cargo
           /* if (oDPRepPorCargo.getDateValue()) {
                var vMinDate = new Date(oDPRepPorCargo.getDateValue().getFullYear(), oDPRepPorCargo.getDateValue().getMonth(), 1),
                    vMaxDate = new Date(oDPRepPorCargo.getDateValue().getFullYear(), oDPRepPorCargo.getDateValue().getMonth() + 1, 0);
                aRepPorCargoFilter.push(new Filter({
                    path: "ultimoRegistro",
                    operator: FilterOperator.BT,
                    value1: vMinDate,
                    value2: vMaxDate
                }));
            } else {

                var vMinDate = new Date(vToday.getFullYear(), vToday.getMonth(), 1),
                    vMaxDate = new Date(vToday.getFullYear(), vToday.getMonth() + 1, 0);

                aRepPorCargoFilter.push(new Filter({
                    path: "ultimoRegistro",
                    operator: FilterOperator.BT,
                    value1: vMinDate,
                    value2: vMaxDate
                }));

            }*/

            //Filtros Comparativos Com Temas
            if (oDPCompComTemas.getDateValue()) {
                var vMinDate = new Date(oDPCompComTemas.getDateValue().getFullYear(), oDPCompComTemas.getDateValue().getMonth(), 1),
                    vMaxDate = new Date(oDPCompComTemas.getDateValue().getFullYear(), oDPCompComTemas.getDateValue().getMonth() + 1, 0);
                aComparativosTemaFilter.push(new Filter({
                    path: "ultimoRegistro",
                    operator: FilterOperator.BT,
                    value1: vMinDate,
                    value2: vMaxDate
                }));
            } else {

                var vMinDate = new Date(vToday.getFullYear(), vToday.getMonth(), 1),
                    vMaxDate = new Date(vToday.getFullYear(), vToday.getMonth() + 1, 0);

                aComparativosTemaFilter.push(new Filter({
                    path: "ultimoRegistro",
                    operator: FilterOperator.BT,
                    value1: vMinDate,
                    value2: vMaxDate
                }));

            }

            //Desconsidera Temas Encerrados
            aFilter.push(new Filter("status_ID", FilterOperator.NE, 4));
           // aRepPorCargoFilter.push(new Filter("status_ID", FilterOperator.NE, 4));

            this.getTemasPorRegulador(aFilter);
            this.getTemasPorCriticidade(aFilter);
            this.getComparativoComTemas(aComparativosTemaFilter);

            if (oObjectUser.userLog.userProfile_ID !== "REP") {               
                //this.getRepresentacoesPorCargo(aRepPorCargoFilter);
                this.getRepresentacoesPorCargo();
                this.getComissoesSemRepresentantePorRegulador();
                this.getComissoesComRepresentantePorRegulador();
            }

        },

        setNoDataVizFrame: function(oControl){

            var assignedContentData = {
                data: []
            };
            var dataModel = new JSONModel(assignedContentData);

            oControl.setModel(dataModel); 

            var feeds = oControl.getFeeds();
            for (var i = 0; i < feeds.length; i++) {
                var axisFeed = feeds[i];
                oControl.removeFeed(axisFeed);               
            }


        },

        getRepresentacoesPorCargo: function () {

            var oModel = this.getModel(),
                that = this,
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/getRepresentacoesPorCargo()';
                //sPath = '/Historico';

            oModel.read(sPath, {
                //filters: [aFilter],
                /*urlParameters: {
                    "$expand": "representante($expand=cargoClassif)",
                    "$select": "idTema,ultimoRegistro"
                },*/

                success: function (oData) {
                    var oResults = oData.results,
                        oVizFrame = that.getView().byId("idVizFrameRepPorCargo");                            

                    if (oData.results.length > 0) {
                        for (let i = 0; i < oResults.length; i++) {
                            const element = oResults[i];

                            aMeasures.push({
                                CARGO: element.cargo,
                                TOTAL: element.qtd
                            });
                          
                        }  

                        var assignedContentData = {
                            RepresentacoesPorCargo: aMeasures
                        };
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "CARGO",
                            value: "{CARGO}"
                        });
                        aMeasuresConfig.push({
                            name: "TOTAL",
                            value: "{TOTAL}"
                        });

                        oVizFrame.destroyDataset();
                        oVizFrame.destroyFeeds();

                        var oSorter = new sap.ui.model.Sorter("CARGO", false);

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
                            values: ["CARGO"]
                        }));

                        oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                            uid: "valueAxis",
                            type: "Measure",
                            values: ["TOTAL"]
                        }));
                    } else {

                        aMeasures.push({
                            STATUS: "",
                            TOTAL: 0
                        });

                        var assignedContentData = {
                            ComparativosComTemas: aMeasures
                        };
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "CARGO",
                            value: "{CARGO}"
                        });
                        aMeasuresConfig.push({
                            name: "TOTAL",
                            value: "{TOTAL}"
                        });

                        oVizFrame.destroyDataset();
                        oVizFrame.destroyFeeds();

                        var oSorter = new sap.ui.model.Sorter("CARGO", false);                      

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
                            values: ["CARGO"]
                        }));

                        oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                            uid: "valueAxis",
                            type: "Measure",
                            values: ["TOTAL"]
                        }));
                        //that.setNoDataVizFrame(oVizFrame);
                    }

                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },        

        getTemasPorRegulador: function (aFilter) {
            var oModel = this.getModel(),
                that = this,
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/TemasPorRegulador';

            oModel.read(sPath, {
                filters: [aFilter],
                urlParameters: {
                    "$expand": "itens"
                },

                success: function (oData) {
                    var oResults = oData.results;
                    var oVizFrame = that.getView().byId("idVizFrame"),
                        vVizTypeComb = 0;
                    if (oData.results.length > 0) {
                        var vTotal = 0
                        for (let i = 0; i < oResults.length; i++) {
                            const tema = oResults[i];

                            var oMeasure = {};
                            var sElement = '{ "MESANO": "' + tema.ultimoRegistro + '","',
                                vTotal = 0;

                            var aReguladoresMes = tema.itens.results;

                            if (aReguladoresMes.length > 1) {
                                //Bug: Se somente retornar um feed, tipo de grafico deve ser de colunas e não combinado        
                                vVizTypeComb++;
                            }

                            for (let z = 0; z < aReguladoresMes.length; z++) {
                                const element = aReguladoresMes[z];

                                vTotal += element.qtd;
                                sElement += element.descricao + '": ' + element.qtd;
                                if (z !== aReguladoresMes.length - 1) {
                                    sElement += ',"';
                                }

                                aMeasuresConfig.push({
                                    name: element.descricao,
                                    value: '{' + element.descricao + '}'
                                });

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
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "MESANO",
                            value: "{path:'MESANO', type: 'sap.ui.model.type.Date', formatOptions: { pattern : 'MMM/yyyy' } }"
                        });
                        //aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });


                        aMeasuresConfig = aMeasuresConfig.filter((measure, index, self) =>
                            index === self.findIndex((t) => (
                                t.name === measure.name && t.name === measure.name
                            ))
                        );

                        oVizFrame.destroyDataset();
                        oVizFrame.destroyFeeds();

                        //Bug: Se somente retornar um feed, tipo de grafico deve ser de colunas e não combinado   
                        if (vVizTypeComb > 0) {
                            oVizFrame.setVizType("stacked_column");
                        } else {
                            oVizFrame.setVizType("column");
                        }

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

                        /*oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                             uid: "valueAxis",
                             type: "Measure",
                             values: ["TOTAL"]
                         }));*/


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

                    } else {

                        that.setNoDataVizFrame(oVizFrame);
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
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = '/TemasPorCriticidade';

            oModel.read(sPath, {
                filters: [aFilter],
                urlParameters: {
                    "$expand": "itens"
                },

                success: function (oData) {
                    var oResults = oData.results;
                    var oVizFrame = that.getView().byId("idVizFrameTemasPorCriticidade"),
                        vVizTypeComb = 0;

                    if (oData.results.length > 0) {
                        var vTotal = 0
                        for (let i = 0; i < oResults.length; i++) {
                            const tema = oResults[i];

                            var oMeasure = {};
                            var sElement = '{ "MESANO": "' + tema.ultimoRegistro + '","',
                                vTotal = 0;

                            var aCriticidadesMes = tema.itens.results;

                            if (aCriticidadesMes.length > 1) {
                                //Bug: Se somente retornar um feed, tipo de grafico deve ser de colunas e não combinado        
                                vVizTypeComb++;
                            }

                            for (let z = 0; z < aCriticidadesMes.length; z++) {
                                const element = aCriticidadesMes[z];

                                vTotal += element.qtd;
                                sElement += element.descricao + '": ' + element.qtd;
                                if (z !== aCriticidadesMes.length - 1) {
                                    sElement += ',"';
                                }

                                aMeasuresConfig.push({
                                    name: element.descricao,
                                    value: '{' + element.descricao + '}'
                                });

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
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "MESANO",
                            value: "{path:'MESANO', type: 'sap.ui.model.type.Date', formatOptions: { pattern : 'MMM/yyyy' } }"
                        });
                        //aMeasuresConfig.push({ name: "TOTAL", value: "{TOTAL}" });


                        aMeasuresConfig = aMeasuresConfig.filter((measure, index, self) =>
                            index === self.findIndex((t) => (
                                t.name === measure.name && t.name === measure.name
                            ))
                        );

                        oVizFrame.destroyDataset();
                        oVizFrame.destroyFeeds();

                        if (vVizTypeComb > 0) {
                            oVizFrame.setVizType("stacked_column");
                        } else {
                            oVizFrame.setVizType("column");
                        }

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

                        /* oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                             uid: "valueAxis",
                             type: "Measure",
                             values: ["TOTAL"]
                         }));*/


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
                    } else {
                        that.setNoDataVizFrame(oVizFrame);
                    }


                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },

        getComparativoComTemas: function (aFilter) {
            var oModel = this.getModel(),
                that = this,
                aMeasures = [],
                aDimensions = [],
                aMeasuresConfig = [],
                sPath = "/ComparativoComTemas";                

            oModel.read(sPath, {
                filters: [aFilter],
                urlParameters: {
                    "$expand": "itens",
                    "$orderby": "ultimoRegistro desc"
                },
                success: function (oData) {
                    var oResults = oData.results,
                        oVizFrame = that.getView().byId("idVizFrameCompComTemas");                            

                    if (oData.results.length > 0) {

                        for (let z = 0; z < oResults.length; z++) {
                            const element = oResults[z];

                            var aItens = element.itens.results;
                            for (let i = 0; i < aItens.length; i++) {
                                const item = aItens[i];
                                aMeasures.push({
                                    STATUS: item.descricao,
                                    TOTAL: item.qtd,
                                    SORTER: item.sorter
                                });
                            }                         
                            
                        }  

                        var assignedContentData = {
                            ComparativosComTemas: aMeasures
                        };
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "STATUS",
                            value: "{STATUS}"
                        });
                        aMeasuresConfig.push({
                            name: "TOTAL",
                            value: "{TOTAL}"
                        });

                        oVizFrame.destroyDataset();
                        oVizFrame.destroyFeeds();

                        var oSorter = new sap.ui.model.Sorter("SORTER", false);

                        //New dataset
                        oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                            dimensions: aDimensions,
                            measures: aMeasuresConfig,
                            data: {
                                path: "/ComparativosComTemas",
                                sorter: oSorter
                            }
                        }));

                        oVizFrame.setVizProperties({ categoryAxis: {
                            title: {
                                visible: false
                            },
                            label:{
                                angle: 0,
                                linesOfWrap: 3
                            }
                        }});

                        //Add feeds
                        oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                            uid: "categoryAxis",
                            type: "Dimension",
                            values: ["STATUS"]
                        }));

                        oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                            uid: "valueAxis",
                            type: "Measure",
                            values: ["TOTAL"]
                        }));
                    } else {

                        aMeasures.push({
                            CARGO: "",
                            TOTAL: 0
                        });

                        var assignedContentData = {
                            RepresentacoesPorCargo: aMeasures
                        };
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "STATUS",
                            value: "{STATUS}"
                        });
                        aMeasuresConfig.push({
                            name: "TOTAL",
                            value: "{TOTAL}"
                        });

                        oVizFrame.destroyDataset();
                        oVizFrame.destroyFeeds();

                        var oSorter = new sap.ui.model.Sorter("STATUS", false);                      

                        //New dataset
                        oVizFrame.setDataset(new sap.viz.ui5.data.FlattenedDataset({
                            dimensions: aDimensions,
                            measures: aMeasuresConfig,
                            data: {
                                path: "/ComparativosComTemas",
                                sorter: oSorter
                            }
                        }));

                        //Add feeds
                        oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                            uid: "categoryAxis",
                            type: "Dimension",
                            values: ["STATUS"]
                        }));

                        oVizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                            uid: "valueAxis",
                            type: "Measure",
                            values: ["TOTAL"]
                        }));

                        //that.setNoDataVizFrame(oVizFrame);
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
                oUser = this.getModel("userLogModel").getData(),
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
                        sSemRegulador = that.getResourceBundle().getText("sem_regulador_txt"),
                        oVizFrame = that.getView().byId("idVizFrameComissSemRep");
                    

                    if (oData.results.length > 0 ) {
                        var aReguladores = oResults.filter((comissao, index, self) =>
                            index === self.findIndex((t) => (
                                t.regulador.ID === comissao.regulador.ID  && t.regulador.ID  === comissao.regulador.ID 
                            ))
                        );

                        for (let i = 0; i < aReguladores.length; i++) {
                            const regulador = aReguladores[i];

                            var aComissoesRegulador = oResults.filter(r => {
                                return r.regulador.ID  === regulador.regulador.ID 
                            });

                            if (regulador.regulador) {
                                aMeasures.push({
                                    REGULADOR: regulador.regulador.descricao,
                                    TOTAL: aComissoesRegulador.length
                                });
                            } else {
                                aMeasures.push({
                                    REGULADOR: sSemRegulador,
                                    TOTAL: aComissoesRegulador.length
                                });
                            }


                        }

                        var assignedContentData = {
                            ComissoesSemRepresentante: aMeasures
                        };
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "REGULADOR",
                            value: "{REGULADOR}"
                        });
                        aMeasuresConfig.push({
                            name: "TOTAL",
                            value: "{TOTAL}"
                        });

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
                    } else {
                       // that.setNoDataVizFrame(oVizFrame);

                       aMeasures.push({
                        CARGO: "",
                        TOTAL: 0
                         });

                    var assignedContentData = {
                        RepresentacoesPorCargo: aMeasures
                    };
                    var dataModel = new JSONModel(assignedContentData);                 

                    oVizFrame.setModel(dataModel);

                    aDimensions.push({
                        name: "REGULADOR",
                        value: "{REGULADOR}"
                    });
                    aMeasuresConfig.push({
                        name: "TOTAL",
                        value: "{TOTAL}"
                    });

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



                    }

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
                    var oResults = oData.results,
                    oVizFrame = that.getView().byId("idVizFrameComissComRep");

                    if (oData.results.length > 0) {
                        var aReguladores = oResults.filter((comissao, index, self) =>
                            index === self.findIndex((t) => (
                                t.regulador === comissao.regulador && t.regulador === comissao.regulador
                            ))
                        );

                        for (let i = 0; i < aReguladores.length; i++) {
                            const regulador = aReguladores[i];


                            var aComissoesRegulador = oResults.filter(r => {
                                return r.regulador.descricao === regulador.regulador.descricao
                            });

                            if (regulador.regulador) {
                                aMeasures.push({
                                    REGULADOR: regulador.regulador.descricao,
                                    TOTAL: aComissoesRegulador.length
                                });
                            } else {
                                aMeasures.push({
                                    REGULADOR: regulador.regulador,
                                    TOTAL: aComissoesRegulador.length
                                });
                            }


                        }

                        var assignedContentData = {
                            ComissoesComRepresentante: aMeasures
                        };
                        var dataModel = new JSONModel(assignedContentData);

                        oVizFrame.setModel(dataModel);

                        aDimensions.push({
                            name: "REGULADOR",
                            value: "{REGULADOR}"
                        });
                        aMeasuresConfig.push({
                            name: "TOTAL",
                            value: "{TOTAL}"
                        });

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
                    }else{
                        that.setNoDataVizFrame(oVizFrame);
                    }

                    that.hideBusy();
                },
                error: function (oError) {
                    that.hideBusy();
                }
            });
        },

        //Download PDF
        onSavePDF: function () {
            var oUser = this.getModel("userLogModel").getData(),
                oRb = this.getResourceBundle();

            //Step 1: Export chart content to svg
            var oVizFrame = this.getView().byId("idVizFrame"),
                oVizFrameComissSemRep = this.getView().byId("idVizFrameComissSemRep"),
                oVizFrameComissComRep = this.getView().byId("idVizFrameComissComRep"),
                oVizFrameRepPorCargo = this.getView().byId("idVizFrameRepPorCargo"),
                oVizFrameTemasPorCriticidade = this.getView().byId("idVizFrameTemasPorCriticidade"),
                oVizFrameCompComTemas = this.getView().byId("idVizFrameCompComTemas");
            var sSVG = oVizFrame.exportToSVGString({
                width: 800,
                height: 600
            });
            var sSVG = {},
                sSVGTemasPorCriticidade = {},
                sSVGCompComTemas = {},
                sSVGComissSemRep = {},
                sSVGComissComRep = {},
                sSVGRepPorCargo = {};

            var oPDF = new jsPDF();            
            var oCanvasHTMLComissSemRep = document.createElement("canvas");
            var oCanvasHTMLComissComRep = document.createElement("canvas");
            var oCanvasHTMLRepPorCargo = document.createElement("canvas");
            var oCanvasHTMLTemasPorReg = document.createElement("canvas");
            var oCanvasHTMLTemasPorCriticidade = document.createElement("canvas");
            var oCanvasHTMLCompComTemas = document.createElement("canvas");

            //Titulos
            oPDF.setFontSize(16);

            //Temas Por regulador
            sSVG = oVizFrame.exportToSVGString({
                width: 600,
                height: 460
            });

            sSVGTemasPorCriticidade = oVizFrameTemasPorCriticidade.exportToSVGString({
                width: 600,
                height: 460
            });

            sSVGCompComTemas = oVizFrameCompComTemas.exportToSVGString({
                width: 1165,
                height: 480
            });

            sSVG = sSVG.replace(/translate /gm, "translate");
            sSVGTemasPorCriticidade = sSVGTemasPorCriticidade.replace(/translate /gm, "translate");
            sSVGCompComTemas = sSVGCompComTemas.replace(/translate /gm, "translate");

            if (oUser.userLog.userProfile_ID !== "REP") {
                sSVGComissSemRep = oVizFrameComissSemRep.exportToSVGString({
                    width: 1200,
                    height: 768
                });
                sSVGComissComRep = oVizFrameComissComRep.exportToSVGString({
                    width: 1200,
                    height: 768
                });
                sSVGRepPorCargo = oVizFrameRepPorCargo.exportToSVGString({
                    width: 1165,
                    height: 480
                });

                sSVGComissSemRep = sSVGComissSemRep.replace(/translate /gm, "translate");
                sSVGComissComRep = sSVGComissComRep.replace(/translate /gm, "translate");
                sSVGRepPorCargo = sSVGRepPorCargo.replace(/translate /gm, "translate");

                canvg(oCanvasHTMLComissSemRep, sSVGComissSemRep);
                canvg(oCanvasHTMLComissComRep, sSVGComissComRep);
                canvg(oCanvasHTMLRepPorCargo, sSVGRepPorCargo);

                canvg(oCanvasHTMLTemasPorReg, sSVG); // add SVG content to Canvas           
                canvg(oCanvasHTMLTemasPorCriticidade, sSVGTemasPorCriticidade);
                canvg(oCanvasHTMLCompComTemas, sSVGCompComTemas);

                // STEP 3: Get dataURL for content in Canvas as PNG/JPEG
                var sImageData = oCanvasHTMLComissSemRep.toDataURL("image/png");
                var sImageData2 = oCanvasHTMLComissComRep.toDataURL("image/png");
                var sImageData3 = oCanvasHTMLRepPorCargo.toDataURL("image/png");
                var sImageData4 = oCanvasHTMLTemasPorReg.toDataURL("image/png");
                var sImageData5 = oCanvasHTMLTemasPorCriticidade.toDataURL("image/png");
                var sImageData6 = oCanvasHTMLCompComTemas.toDataURL("image/png");

                // STEP 4: Create PDF using library jsPDF 
                oPDF.text(45, 20, oRb.getText("comissoes_sem_representante_title"));                                 
                oPDF.addImage(sImageData, "PNG", 15, 20, 180, 100);
                oPDF.text(45, 140, oRb.getText("comissoes_com_representante_title"));  
                oPDF.addImage(sImageData2, "PNG", 15, 150, 180, 100);
                oPDF.addPage();
                oPDF.text(55, 20, oRb.getText("representacoes_por_cargo_title"));  
                oPDF.addImage(sImageData3, "PNG", 15, 25, 180, 100);
                oPDF.setFontSize(9);                
                oPDF.text(oRb.getText("representacoes_por_cargo_legenda"),10, 122, {maxWidth: 190});
                oPDF.setFontSize(16);
                oPDF.text(55, 140, oRb.getText("temas_por_reguladores_title"));  
                oPDF.addImage(sImageData4, "PNG", 15, 145, 180, 125);
                oPDF.addPage();
                oPDF.text(55, 20, oRb.getText("temas_por_criticidade_title")); 
                oPDF.addImage(sImageData5, "PNG", 15, 25, 180, 150);
                oPDF.text(65, 185, oRb.getText("comparativos_com_temas_title")); 
                oPDF.addImage(sImageData6, "PNG", 15, 185, 180, 100);
                oPDF.save("Indicadores.pdf");
            } else {

                canvg(oCanvasHTMLTemasPorReg, sSVG); // add SVG content to Canvas           
                canvg(oCanvasHTMLTemasPorCriticidade, sSVGTemasPorCriticidade);
                canvg(oCanvasHTMLCompComTemas, sSVGCompComTemas);

                var sImageData7 = oCanvasHTMLTemasPorReg.toDataURL("image/png");
                var sImageData8 = oCanvasHTMLTemasPorCriticidade.toDataURL("image/png");
                var sImageData9 = oCanvasHTMLCompComTemas.toDataURL("image/png");
                
                oPDF.text(55, 20, oRb.getText("temas_por_reguladores_title"));
                oPDF.addImage(sImageData7, "PNG", 15, 25, 180, 100);
                oPDF.text(55, 140, oRb.getText("temas_por_criticidade_title")); 
                oPDF.addImage(sImageData8, "PNG", 15, 150, 180, 100);
                oPDF.addPage();
                oPDF.text(65, 20, oRb.getText("comparativos_com_temas_title")); 
                oPDF.addImage(sImageData9, "PNG", 15, 25, 180, 160);
                oPDF.save("Indicadores.pdf");

            }


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
                    columns: aCols, //,
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
                fileName: 'Temas.xlsx' //,
                //worker: false // We need to disable worker because we are using a MockServer as OData Service
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        _validateField: function (fieldName) {

            var oControl = sap.ui.getCore().byId(fieldName); //this.getView().byId(fieldName);
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

            var isValid = true,
                swtEnviaEmail = sap.ui.getCore().byId("swtEnviaEmail");

            if (!this._validateField("dtInicio"))
                isValid = false;

            //cmbTipoAlerta
            if (!this._validateField("cmbTipoAlerta"))
                isValid = false;

            if (!this._validateField("txtDescricaoAlerta"))
                isValid = false;

            if (swtEnviaEmail.getState()) {
                var oRTextEditor = sap.ui.getCore().byId("RTextEditor");
                if (oRTextEditor.getValue() === "") {
                    sap.m.MessageToast.show(this.geti18nText("campo_obrigatorio_msg"));
                    isValid = false;
                }
            }

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
                    entitySet = "/AlertasUsuario"; //EventosAlerta

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
                } else {
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
                    sMessage, {
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

                    that.replicaEventoAlertaRequest({
                        idEvento: oData.ID,
                        perfisQueRecebem: oData.perfisQueRecebem,
                        usuariosQueRecebem: oData.usuariosQueRecebem,
                        bCreate: true
                    });

                    that.onCancelAlerta();
                    oModel.refresh();
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_alerta"));
                    oModel.refresh();
                }
            });
        },

        replicaEventoAlertaRequest: function (oParams) {

            var oModel = this.getModel(),
                sEntitySet = "/replicaEventoAlerta";


            oModel.create(sEntitySet, oParams, {
                success: function (oData) {

                },
                error: function (oError) {

                }
            });


        },

        replicaAlteracaoEventoRequest: function (oParams) {

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
                    that.replicaAlteracaoEventoRequest({
                        idEvento: oData.ID,
                        perfisQueRecebem: oData.perfisQueRecebem,
                        usuariosQueRecebem: oData.usuariosQueRecebem,
                        bCreate: false
                    });
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