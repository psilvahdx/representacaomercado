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
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, Fragment) {
    "use strict";

    return BaseController.extend("ps.uiRepMercado.controller.DetalhesTema", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
        onInit: function () {

            this._oDialogCriteriosAvaliacao = sap.ui.xmlfragment("ps.uiRepMercado.view.fragments.CriteriosAvaliacao", this);
            this.getView().addDependent(this._oDialogCriteriosAvaliacao);
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                busy: true,
                delay: 0,
                isEditMode: true
            });
            this.getRouter().getRoute("detalheTema").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "objectView");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */
        _onPageNavButtonPress: function (oEvent) {
            history.go(-1);
        },

        onCancel: function (oEvent) {
            var oViewModel = this.getView().getModel("objectView");
            oViewModel.setProperty("/isEditMode", true);
            this.setEditMode(true);
            history.go(-1);
        },

        updateToggleButtonState: function (oEvent) {
            var oToggleButton = this.byId("toggleButton"),
                sCurrentBreakpoint = oEvent.getParameter("currentBreakpoint");

            if (sCurrentBreakpoint === "S") {
                oToggleButton.setVisible(true);
            } else {
                oToggleButton.setVisible(false);
            }
        },

        onTogglePress: function (oEvent) {
            var oToggleButton = this.byId("toggleButton");

            try {
                if (oEvent.getSource().getPressed()) {
                    oToggleButton.setText(this.geti18nText("voltar_txt"));
                } else {
                    oToggleButton.setText(this.geti18nText("historico_txt"));
                }

            }
            catch (oError) {
                oToggleButton.setText(this.geti18nText("historico_txt"));
            }

            this.byId("DynamicSideContent").toggle();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").idTema,
                oToggleButton = this.byId("toggleButton");

            this.byId("dtUltimaReuniao").setMaxDate(new Date());

            if (sap.ui.Device.system.phone) {
                oToggleButton.setVisible(true);
            } else {
                oToggleButton.setVisible(false);
            }

            this.initializeValidator();
            if (sObjectId !== "New") {
                this._bindView("/Temas(" + sObjectId + ")");
                this.filterHistorico(sObjectId);
                this.byId("cmbStatus").setEditable(true);
            }
            else {
                this.getView().setModel(new JSONModel(this.getTemaTemplate()), "EditTemaModel");
                this.filterHistorico(null);
                this.getComissoesRepresentante();
                var oCmbStatus = this.byId("cmbStatus"),
                    oBinding = oCmbStatus.getBinding("items");
                oBinding.filter([]);

                this.byId("cmbStatus").setEditable(false);
            }

        },

        initializeValidator: function () {

            var txtDescTema = this.byId("txtDescTema"),
                cmbCriticidade = this.byId("cmbCriticidade"),
                txtDetDisc = this.byId("txtDetDisc"),
                txtPrincImpact = this.byId("txtPrincImpact"),
                cmbStatus = this.byId("cmbStatus"),
                inpComissao = this.byId("inpComissao"),
                oObject = this.getModel("userLogModel").getData(),
                objectView = this.getView().getModel("objectView");

            if (oObject.userLog.userProfile_ID === "PRES") {
                this.setEditMode(false);
                objectView.setProperty("/isEditMode", false);
            }
            if(oObject.userLog.userProfile_ID === "VP_DIR"){
                if (!oObject.userLog.acoes.createTemas) {
                    this.setEditMode(false);
                    objectView.setProperty("/isEditMode", false);
                }               
            }

            txtDescTema.setValueState("None");
            cmbCriticidade.setValueState("None");
            txtDetDisc.setValueState("None");
            txtPrincImpact.setValueState("None");
            cmbStatus.setValueState("None");
            inpComissao.setValueState("None");
        },

        filterHistorico: function (idTema) {
            var lstHistorico = this.byId("lstHistorico"),
                oBinding = lstHistorico.getBinding("items"),
                aFilter = new Filter([]),
                oFilter = {};

            oFilter = new Filter("idTema", FilterOperator.EQ, idTema);
            aFilter.aFilters.push(oFilter);
            oBinding.filter(aFilter.aFilters);

        },

        onHistListItemPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext(),
                oViewModel = this.getView().getModel("objectView"),
                lstHistorico = this.byId("lstHistorico"),
                oObject = this.getModel().getObject(oContext.getPath());            

           /* oViewModel.setProperty("/isEditMode", false);
            if (lstHistorico.getItems()[0]._active) {
                oViewModel.setProperty("/isEditMode", true);
            }
            oViewModel.refresh();*/

            if (!lstHistorico.getItems()[0]._active) {
                this._bindView("/Historico(" + oObject.ID + ")",true);
            }else{
                this._bindView("/Historico(" + oObject.ID + ")");
            }
            
            this.onTogglePress(oEvent);
        },

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
        _bindView: function (sObjectPath, isHistorico) {
            var oModel = this.getModel(),
                that = this,
                oCmbStatus = this.byId("cmbStatus"),
                oViewModel = this.getModel("objectView"),
                oUserLog = this.getModel("userLogModel").getData();

            oModel.read(sObjectPath, {
                urlParameters: {
                    "$expand": "representante,comissao,regulador"
                },
                success: function (oData) {
                    var oEditTemaModel = new JSONModel(oData);
                    that.getView().setModel(oEditTemaModel, "EditTemaModel");

                    if (oData.status_ID === 4) {
                        //Tema encerrado não pode ser editado
                        that.setEditMode(false);
                        oViewModel.setProperty("/isEditMode", false);
                    } else {
                        oViewModel.setProperty("/isEditMode", true);
                        that.setEditMode(true);
                        if (oData.status_ID > 1) {
                            var oBinding = oCmbStatus.getBinding("items");
                            oBinding.filter(new Filter("ID", FilterOperator.NE, 1));
                        }
                    }
                    if (oUserLog.userLog.userProfile_ID === "PRES") {
                        that.setEditMode(false);
                        oViewModel.setProperty("/isEditMode", false);
                    }
                    if (oUserLog.userLog.userProfile_ID === "VP_DIR") {

                        that.setEditMode(false);
                        oViewModel.setProperty("/isEditMode", false); 

                        if (oUserLog.userLog.acoes.createTemas) {                           
                            var oUsrComissoesModel =  sap.ui.getCore().getModel("comissoesUsuarioModel"),
                                aUsrComissoes = oUsrComissoesModel.getData().results;
                            
                            const find = aUsrComissoes.find(f => f.ID === oData.comissao_ID);
                            if (find) {
                               that.setEditMode(true);
                               oViewModel.setProperty("/isEditMode", true);   
                            }                            
                        }                        
                       
                    }

                    if (isHistorico) {                      
                        oViewModel.setProperty("/isEditMode", false); 
                        that.setEditMode(false);                       
                    }                    

                    oViewModel.refresh();
                },
                error: function (oError) {

                }
            });

        },

        setEditMode: function (bEdit) {

            var txtDescTema = this.byId("txtDescTema"),
                cmbCriticidade = this.byId("cmbCriticidade"),
                txtDetDisc = this.byId("txtDetDisc"),
                txtPrincImpact = this.byId("txtPrincImpact"),
                cmbStatus = this.byId("cmbStatus"),
                inpComissao = this.byId("inpComissao"),
                dtUltimaReuniao = this.byId("dtUltimaReuniao"),
                inpRepresentante = this.byId("inpRepresentante"),
                oUserLog = this.getModel("userLogModel").getData();

            txtDescTema.setEditable(bEdit);           
            txtDetDisc.setEditable(bEdit);
            txtPrincImpact.setEditable(bEdit);
            cmbStatus.setEditable(bEdit);
            inpComissao.setEditable(bEdit);
            dtUltimaReuniao.setEditable(bEdit);

            if(oUserLog.userLog.userProfile_ID === "ADM"){
                inpRepresentante.setEditable(bEdit);
                cmbCriticidade.setEditable(bEdit);
            }
            

        },

        getComissoesRepresentante: function () {
            this.openDialogComissao(null);
        },

        getReguladorPorComissao(sIdComissao) {
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getView().getModel("EditTemaModel").getData(),
                that = this,
                sPath = "/Comissoes(" + sIdComissao + ")/regulador";

            oModel.read(sPath, {
                success: function (oData) {
                    var oReguladorModel = new JSONModel(oData);
                    oView.setModel(oReguladorModel, "reguladorModel");

                    var oRegulador = oReguladorModel.getData();
                    if (oRegulador) {
                        oObject.regulador_ID = oRegulador.ID;
                        oObject.regulador.descricao = oRegulador.descricao;

                    } else {
                        oObject.regulador_ID = "";
                        oObject.regulador.descricao = "";
                    }
                    that.getView().getModel("EditTemaModel").refresh();


                },
                error: function (oError) {
                    oObject.regulador_ID = "";
                    oObject.regulador.descricao = "";
                    that.getView().getModel("EditTemaModel").refresh();
                    oOwnerComponent._genericErrorMessage(that.geti18nText("load_regulador_erro"));
                }

            });

        },

        /**         
         * Fragment Comissoes
         */

        openDialogComissao: function (oEvent) {
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getView().getModel("EditTemaModel").getData(),
                that = this,
                event = oEvent,
                sPath = "/Usuarios('" + oObject.representante_ID + "')/comissoes";

            if (oObject.representante_ID) {

                this.oDialogComissao = this.getDialogComissao("ps.uiRepMercado.view.fragments.Comissoes");

                oModel.read(sPath, {
                    urlParameters: {
                        "$expand": "comissao"
                    },
                    success: function (oData) {
                        var oCommissoesModel = new JSONModel(oData);
                        oView.setModel(oCommissoesModel, "comissoesModel");
                        if (event) {
                            that._oDialogComissao.open();
                        } else {

                            if (oData.results.length <= 1) {

                                var oComissao = oCommissoesModel.getProperty("/results")[0];
                                if (oComissao) {
                                    oObject.comissao_ID = oComissao.comissao_ID;
                                    oObject.comissao.descricao = oComissao.comissao.descricao;
                                    that.getReguladorPorComissao(oComissao.comissao_ID);

                                } else {
                                    oObject.comissao_ID = "";
                                    oObject.comissao.descricao = "";
                                    oObject.regulador_ID = "";
                                    oObject.regulador.descricao = "";
                                }


                                that.getView().getModel("EditTemaModel").refresh();
                            }

                        }

                    },
                    error: function (oError) {

                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_comissoes_erro"));
                    }

                });
            }
        },

        getDialogComissao: function (sFragment) {
            if (!this._oDialogComissao) {
                this._oDialogComissao = sap.ui.xmlfragment(sFragment, this);
                this.getView().addDependent(this._oDialogComissao);
            }

            return this._oDialogComissao;
        },

        _onDefineComissaoPress: function (oEvent) {
            var oSelItem = oEvent.getParameter("selectedItem"),
                editModel = this.getModel("EditTemaModel"),
                editData = editModel.getData();

            var oComissao = this.getModel("comissoesModel").getObject(oSelItem.getBindingContextPath());
            editData.comissao_ID = oComissao.comissao.ID;
            editData.comissao.descricao = oComissao.comissao.descricao;
            editModel.refresh();
            this.getReguladorPorComissao(editData.comissao_ID);
        },

        createFilter: function (key, value, operator, useToLower) {
            return new Filter(useToLower ? "tolower(" + key + ")" : key, operator, useToLower ? "'" + value.toLowerCase() + "'" : value)
        },

        _onSearchComissoes: function (oEvent) {

            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "descricao",
                FilterOperator.Contains,
                sValue
            );
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        /**         
         * Fragment Representante
         */

        openDialogRepresentante: function (oEvent) {
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getView().getModel("EditTemaModel").getData(),
                that = this;
            this.oDialogRepresentante = this.getDialogRepresentante("ps.uiRepMercado.view.fragments.Representantes");

            oModel.read("/Usuarios", {

                success: function (oData) {

                    var oRepresentanteModel = new JSONModel(oData);
                    oView.setModel(oRepresentanteModel, "representanteModel");
                    that._oDialogRepresentante.open();
                },
                error: function (oError) {

                    oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                }

            });

        },

        getDialogRepresentante: function (sFragment) {
            if (!this._oDialogRepresentante) {
                this._oDialogRepresentante = sap.ui.xmlfragment(sFragment, this);
                this.getView().addDependent(this._oDialogRepresentante);
            }

            return this._oDialogRepresentante;
        },

        _onDefineRepresentantePress: function (oEvent) {
            var oSelItem = oEvent.getParameter("selectedItem"),
                editModel = this.getModel("EditTemaModel"),
                editData = editModel.getData();

            var oRepresentante = this.getModel("representanteModel").getObject(oSelItem.getBindingContextPath());
            editData.representante_ID = oRepresentante.ID;
            editData.representante.nome = oRepresentante.nome;
            editData.representante.cargo = oRepresentante.cargo;
            editData.representante.telefone = oRepresentante.telefone;
            this.getComissoesRepresentante();
            editModel.refresh();
        },

        _onSearchRepresentante: function (oEvent) {

            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "nome",
                FilterOperator.Contains,
                sValue
            );
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        getViewEntity: function () {
            var oObject = this.getView().getModel("EditTemaModel").getData(),
                oView = this.getView(),
                oParams = {
                    ID: oObject.idTema ? oObject.idTema : oObject.ID,
                    comissao_ID: parseInt(oObject.comissao_ID),
                    criticidade_ID: parseInt(oObject.criticidade_ID),
                    dataUltimaReuniao: oObject.dataUltimaReuniao,
                    descricao: oObject.descricao,
                    detalheDiscussao: oObject.detalheDiscussao,
                    diretorExecutivo: oObject.diretorExecutivo,
                    diretorGeral: oObject.diretorGeral,
                    primeiroRegistro: oObject.primeiroRegistro,
                    principaisImpactos: oObject.principaisImpactos,
                    regulador_ID: parseInt(oObject.regulador_ID),
                    representante_ID: oObject.representante_ID,
                    status_ID: parseInt(oObject.status_ID),
                    ultimoRegistro: new Date()
                };

            if (oObject.representante_ID === "") {
                oParams.representante_ID = oObject.representante.ID;
            }
            if (oObject.comissao_ID === "") {
                oParams.comissao_ID = oObject.comissao.ID;
            }

            //Datas
            var dataUltimaReuniao = oView.byId("dtUltimaReuniao").getDateValue();

            if (!dataUltimaReuniao) {
                var sDtUltimaReuniao = oView.byId("dtUltimaReuniao").getValue();
                sDtUltimaReuniao = sDtUltimaReuniao.trim();
                if (sDtUltimaReuniao) {
                    dataUltimaReuniao = new Date(sDtUltimaReuniao.substring(3, 5) + "/" +
                        sDtUltimaReuniao.substring(0, 2) + "/" +
                        sDtUltimaReuniao.substring(6, 10)
                    );
                }
            }

            oParams.dataUltimaReuniao = dataUltimaReuniao;

            return oParams;
        },

        getTemaTemplate: function () {

            var oFilterData = this.getModel("filterModel").getData(),
                oUserModel = this.getModel("userLogModel").getData();

            var oParams = {
                ID: "",
                comissao_ID: "",
                criticidade_ID: "",
                dataUltimaReuniao: "",
                descricao: "",
                detalheDiscussao: "",
                diretorExecutivo: oUserModel.userLog.diretorExecutivo,
                diretorGeral: oUserModel.userLog.diretorGeral,
                primeiroRegistro: new Date(),
                principaisImpactos: "",
                regulador_ID: "",
                representante_ID: oUserModel.userLog.ID,
                status_ID: 1,
                ultimoRegistro: "",
                representante: {
                    ID: oUserModel.userLog.ID,
                    matricula: oUserModel.userLog.ID,
                    nome: oUserModel.userLog.nomeColaborador,
                    cargo: oUserModel.userLog.cargo,
                    telefone: oUserModel.userLog.telefone
                },
                comissao: {
                    ID: "",
                    descricao: ""
                },
                regulador: {
                    ID: "",
                    descricao: ""
                }
            };

            if (oFilterData.temas.tema !== "") {
                oParams.descricao = oFilterData.temas.tema;
            }

            return oParams;
        },

        validaDuplicidadeTema: function () {

            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getView().getModel("EditTemaModel").getData(),
                that = this,
                aFilter = new Filter([]),
                oFilter = {};

            this.isTemaDuplicado = false;

            oFilter = new Filter("descricao", FilterOperator.Contains, oObject.descricao);
            aFilter.aFilters.push(oFilter);

            oFilter = new Filter("status_ID", FilterOperator.NE, 4);//Encerrado
            aFilter.aFilters.push(oFilter);

            oModel.read("/Temas", {
                filters: [aFilter.aFilters],
                success: function (oData) {
                    if (oData.results.length > 0) {
                        that.isTemaDuplicado = true;
                    } else {
                        that.isTemaDuplicado = false;
                    }
                },
                error: function (oError) {

                }

            });
            return (this.isTemaDuplicado);

        },

        _validateField: function (fieldName) {

            var oControl = this.getView().byId(fieldName);
            var value;

            if (fieldName.substring(0, 3) === "sel") {
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

        validaInformacoes: function () {

            var isValid = true,
                oUserLog = this.getModel("userLogModel");

            if (!this._validateField("txtDescTema")) {
                isValid = false;
            }

            if (!this._validateField("inpComissao")) {
                isValid = false;
            }

            if (!this._validateField("txtDetDisc")) {
                isValid = false;
            }


            if (!this._validateField("txtPrincImpact")) {
                isValid = false;
            }            


            if (oUserLog.getProperty("/userLog/userProfile_ID") === "ADM") {
                if (!this._validateField("cmbCriticidade")) {
                    isValid = false;
                }

            }

            return isValid;
        },

        onSaveButtonPress: function (oEvent) {

            var that = this,
                oParams = this.getViewEntity(),
                oViewModel = this.getModel("objectView"),
                entitySet = "/Temas";

            if (this.validaInformacoes()) {

                if (oParams.ID === "") {
                    //Novo Tema                   
                    this.saveTema(oParams, oViewModel, entitySet);
                }
                else {
                    //Atualiza Tema
                    this.updateTema(oParams, oViewModel, entitySet);
                }
            }


        },

        saveTema: function (oParams, oViewModel, entitySet) {
            var sMessage = "",
                oModel = this.getModel(),
                oUserLog = this.getModel("userLogModel"),
                that = this,
                aFilter = new Filter([]),
                oFilter = {};

            delete oParams.ID;
            //oFilter = this.createFilter("descricao", oParams.descricao, FilterOperator.Contains, true);
            oFilter = new Filter({
                path: 'descricao',
                operator: FilterOperator.Contains,
                value1: oParams.descricao,
                caseSensitive: false
            });
            aFilter.aFilters.push(oFilter);

            oFilter = new Filter("status_ID", FilterOperator.NE, 4);//Encerrado
            aFilter.aFilters.push(oFilter);

            oModel.read("/Temas", {
                filters: [aFilter.aFilters],
                success: function (oData) {
                    if (oData.results.length > 0) {

                        //Tema em duplicidade, notifica usuário
                        sMessage = that.getResourceBundle().getText("confirma_duplicidade_tema_txt");
                        MessageBox.information(
                            sMessage,
                            {
                                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                                onClose: function (sAction) {
                                    if (sAction === MessageBox.Action.YES) {
                                        if (oUserLog.getProperty("/userLog/userProfile_ID") === "ADM") {
                                            that.sendCreateTemaRequest(entitySet, oParams);
                                        } else {
                                            that.openDialogCriteriosAvaliacao();
                                        }

                                    }
                                }
                            });

                    } else {
                        if (oUserLog.getProperty("/userLog/userProfile_ID") === "ADM") {
                            that.sendCreateTemaRequest(entitySet, oParams);
                        } else {
                            that.openDialogCriteriosAvaliacao();
                        }

                    }
                },
                error: function (oError) {

                }

            });


        },

        updateTema: function (oParams, oViewModel, entitySet) {
            var sMessage = "",
                that = this;

            entitySet = entitySet + "(ID=" + oParams.ID + ")";
            sMessage = this.getResourceBundle().getText("confirma_status_tema_txt");

            if (oParams.status_ID === 1 || oParams.status_ID === 2) {//Status Novo ou Sem Atualização
                oParams.status_ID = 3; //Atualizado
                that.sendUpdateTemaRequest(entitySet, oParams);
                /*MessageBox.information(
                    sMessage,
                    {
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        onClose: function (sAction) {
                            if (sAction === MessageBox.Action.YES) {
                                that.sendUpdateTemaRequest(entitySet, oParams);
                            }
                        }
                    });*/
            } else {
                this.sendUpdateTemaRequest(entitySet, oParams);
            }

        },

        sendCreateTemaRequest: function (entitySet, oParams) {

            var oModel = this.getModel(),
                that = this;

            oModel.create(entitySet, oParams, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_tema"));
                    oParams.idTema = oData.ID;
                    that.saveHistorico(oParams, null);
                    that.byId("cmbStatus").setEditable(true);
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tema"));

                    oModel.refresh();
                }
            });
        },

        sendUpdateTemaRequest: function (entitySet, oParams) {

            var oModel = this.getModel(),
                that = this,
                oOldTema = oModel.getObject("/Temas(" + oParams.ID + ")")

            oModel.update(entitySet, oParams, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_tema"));
                    oParams.idTema = oData.ID;
                    that.saveHistorico(oParams, oOldTema);
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tema"));

                    oModel.refresh();
                }
            });

        },

        saveHistorico: function (oParams, oOldTema) {
            var oModel = this.getModel(),
                that = this,
                oUserLog = this.getModel("userLogModel").getData(),
                sDescricao = this.getResourceBundle().getText("tema_txt"),
                sStatus = this.getResourceBundle().getText("status_txt"),
                sDtUltimaReuniao = this.getResourceBundle().getText("ultima_reuniao_txt"),
                sComissao = this.getResourceBundle().getText("comissao_short_txt"),
                sDetalheDiscussao = this.getResourceBundle().getText("detalhamento_discussao_txt"),
                sPrincipaisImpactos = this.getResourceBundle().getText("principais_impactos_short_txt");

            delete oParams.ID;

            oParams.userAlteracao_ID = oUserLog.userLog.ID;

            //Registra log de campos que foram modificados
            if (oOldTema) {
                if (oParams.descricao !== oOldTema.descricao) {
                    oParams.descAlterda = this.getResourceBundle().getText("campo_alterado_msg", [sDescricao]);
                }
                if (oParams.comissao_ID !== oOldTema.comissao_ID) {
                    oParams.comissaoAlterado = this.getResourceBundle().getText("campo_alterado_msg", [sComissao]);
                }
                if (oParams.status_ID !== oOldTema.status_ID) {
                    oParams.statusAlterado = this.getResourceBundle().getText("campo_alterado_msg", [sStatus]);
                }
                if (oParams.detalheDiscussao !== oOldTema.detalheDiscussao) {
                    oParams.detalheAlterado = this.getResourceBundle().getText("campo_alterado_msg", [sDetalheDiscussao]);
                }
                if (oParams.principaisImpactos !== oOldTema.principaisImpactos) {
                    oParams.princImpAlterado = this.getResourceBundle().getText("campo_alterado_msg", [sPrincipaisImpactos]);
                }
                if (oParams.dataUltimaReuniao) {
                    var sDataUltimaReuniao = oOldTema.dataUltimaReuniao ? oOldTema.dataUltimaReuniao.toDateString() : null;
                    if (oParams.dataUltimaReuniao.toDateString() !== sDataUltimaReuniao) {
                        oParams.dtUltimaReuniaoAlterado = this.getResourceBundle().getText("campo_alterado_msg", [sDtUltimaReuniao]);
                    }
                } else {
                    if (oOldTema.dataUltimaReuniao) {
                        oParams.dtUltimaReuniaoAlterado = this.getResourceBundle().getText("campo_alterado_msg", [sDtUltimaReuniao]);
                    }
                }

            }

            oModel.create("/Historico", oParams, {
                success: function (oData) {
                    oModel.refresh();
                    that._bindView("/Temas(" + oData.idTema + ")");
                    that.filterHistorico(oData.idTema);
                },
                error: function (oError) {
                    oModel.refresh();
                }
            });
        },

        /**
         * Wizard Avaliação
         * @param {*} oEvent 
         */
        openDialogCriteriosAvaliacao: function (oEvent) {
            this._oDialogCriteriosAvaliacao.open();

            this._wizard = sap.ui.getCore().byId("criteriosDeAvaliacaoWizard");
            this._oNavContainer = sap.ui.getCore().byId("wizardNavContainer");
            this._oWizardContentPage = sap.ui.getCore().byId("wizardContentPage");

            if (!this._oWizardReviewPage) {

                Fragment.load({
                    name: "ps.uiRepMercado.view.fragments.CriteriosAvaliacaoReview",
                    controller: this
                }).then(function (oWizardReviewPage) {
                    this._oWizardReviewPage = oWizardReviewPage;
                    this._oNavContainer.addPage(this._oWizardReviewPage);
                }.bind(this));
            }

        },

        handleResponsivePopoverPress: function (oEvent) {
            var oButton = oEvent.getSource(),
                oItem = oButton.getParent().getParent(),
                oContext = oItem.getBindingContext("AvaliacaoModel"),
                sPath = "AvaliacaoModel>" + oContext.getPath();


            Fragment.load({
                name: "ps.uiRepMercado.view.fragments.AvaliacaoDetalhesPopover",
                controller: this
            }).then(function (oPopover) {
                this._oPopover = oPopover;
                this.getView().addDependent(this._oPopover);
                this._oPopover.bindElement(sPath);
                this._oPopover.openBy(oButton);
            }.bind(this));

        },

        handleCloseButton: function (oEvent) {
            this._oPopover.close();
            this._oPopover.destroy();

        },

        wizardCompletedHandler: function () {

            var oSelectedAvaliacaoModel = this.getModel("AvaliacaoSelectedModel"),
                olstClassProcess = sap.ui.getCore().byId("lstClassProcess"),
                olstImpactoOper = sap.ui.getCore().byId("lstImpactoOper"),
                olstEsforco = sap.ui.getCore().byId("lstEsforco"),
                olstTempoAdaptacao = sap.ui.getCore().byId("lstTempoAdaptacao"),
                olstAmadurecimentoTema = sap.ui.getCore().byId("lstAmadurecimentoTema"),
                olstIpactoFinanceiro = sap.ui.getCore().byId("lstIpactoFinanceiro"),
                olstOrigem = sap.ui.getCore().byId("lstOrigem");

            this.setAvaliacaoSelectedValue(olstClassProcess, oSelectedAvaliacaoModel, "classifProcess");
            this.setAvaliacaoSelectedValue(olstImpactoOper, oSelectedAvaliacaoModel, "impactoOper");
            this.setAvaliacaoSelectedValue(olstEsforco, oSelectedAvaliacaoModel, "esforco");
            this.setAvaliacaoSelectedValue(olstTempoAdaptacao, oSelectedAvaliacaoModel, "tempoAdaptacao");
            this.setAvaliacaoSelectedValue(olstAmadurecimentoTema, oSelectedAvaliacaoModel, "amadurecimentoTema");
            this.setAvaliacaoSelectedValue(olstIpactoFinanceiro, oSelectedAvaliacaoModel, "impactoFinanceiro");
            this.setAvaliacaoSelectedValue(olstOrigem, oSelectedAvaliacaoModel, "origem");

            oSelectedAvaliacaoModel.refresh();

            this._oNavContainer.to(this._oWizardReviewPage);
        },

        setAvaliacaoSelectedValue: function (oList, oSelectedAvaliacaoModel, entity) {
            var oAvaliacaoModel = this.getModel("AvaliacaoModel"),
                sPath = this.getListSelectedItemBindingContextPath(oList),
                oObject = oAvaliacaoModel.getObject(sPath);

            oSelectedAvaliacaoModel.setProperty("/" + entity + "/text", oObject.text);
            oSelectedAvaliacaoModel.setProperty("/" + entity + "/value", oObject.value);

        },

        getListSelectedItemBindingContextPath: function (oList) {
            var oSelItem = oList.getSelectedItem();
            return oSelItem.getBindingContextPath();
        },

        itemSelectedValidation: function (oEvent) {
            var oSource = oEvent.getSource();

            if (this._wizard) {

                switch (oSource.getId()) {
                    case "lstClassProcess":
                        this._wizard.validateStep(sap.ui.getCore().byId("ClassifProcessStep"));
                        break;
                    case "lstImpactoOper":
                        this._wizard.validateStep(sap.ui.getCore().byId("ImpactoOperStep"));
                        break;
                    case "lstEsforco":
                        this._wizard.validateStep(sap.ui.getCore().byId("EsforcoStep"));
                        break;
                    case "lstTempoAdaptacao":
                        this._wizard.validateStep(sap.ui.getCore().byId("TempoAdaptacaoStep"));
                        break;
                    case "lstAmadurecimentoTema":
                        this._wizard.validateStep(sap.ui.getCore().byId("AmadurecimentoTemaStep"));
                        break;
                    case "lstIpactoFinanceiro":
                        this._wizard.validateStep(sap.ui.getCore().byId("ImpactoFinanceiroStep"));
                        break;
                    case "lstOrigem":
                        this._wizard.validateStep(sap.ui.getCore().byId("OrigemStep"));
                        break;
                    default:
                        break;
                }

            }

        },

        handleWizardSubmit: function (oEvent) {
            this.setCriticidade();
            this.removeSelections();
            this._handleNavigationToStep(0);
            this._wizard.discardProgress(this._wizard.getSteps()[0]);
            this._oDialogCriteriosAvaliacao.close();

            var oParams = this.getViewEntity(),
                oViewModel = this.getModel("objectView"),
                entitySet = "/Temas";

            delete oParams.ID;
            this.sendCreateTemaRequest(entitySet, oParams);

        },

        handleWizardCancel: function (oEvent) {
            this.removeSelections();
            this._handleNavigationToStep(0);
            this._wizard.discardProgress(this._wizard.getSteps()[0]);
            this._oDialogCriteriosAvaliacao.close();
        },

        removeSelections: function () {
            var olstClassProcess = sap.ui.getCore().byId("lstClassProcess"),
                olstImpactoOper = sap.ui.getCore().byId("lstImpactoOper"),
                olstEsforco = sap.ui.getCore().byId("lstEsforco"),
                olstTempoAdaptacao = sap.ui.getCore().byId("lstTempoAdaptacao"),
                olstAmadurecimentoTema = sap.ui.getCore().byId("lstAmadurecimentoTema"),
                olstIpactoFinanceiro = sap.ui.getCore().byId("lstIpactoFinanceiro"),
                olstOrigem = sap.ui.getCore().byId("lstOrigem");
            // @ts-ignore
            olstClassProcess.removeSelections(true);
            // @ts-ignore
            olstImpactoOper.removeSelections(true);
            // @ts-ignore
            olstEsforco.removeSelections(true);
            // @ts-ignore
            olstTempoAdaptacao.removeSelections(true);
            // @ts-ignore
            olstAmadurecimentoTema.removeSelections(true);
            // @ts-ignore
            olstIpactoFinanceiro.removeSelections(true);
            // @ts-ignore
            olstOrigem.removeSelections(true);
            this._wizard.invalidateStep(sap.ui.getCore().byId("ClassifProcessStep"));
        },

        setCriticidade: function () {
            var ocmbCriticidade = this.byId("cmbCriticidade"),
                oSelectedAvaliacaoModel = this.getModel("AvaliacaoSelectedModel");

            var vTotal = 0;
            vTotal += oSelectedAvaliacaoModel.getProperty("/classifProcess/value");
            vTotal += oSelectedAvaliacaoModel.getProperty("/impactoOper/value");
            vTotal += oSelectedAvaliacaoModel.getProperty("/esforco/value");
            vTotal += oSelectedAvaliacaoModel.getProperty("/tempoAdaptacao/value");
            vTotal += oSelectedAvaliacaoModel.getProperty("/amadurecimentoTema/value");
            vTotal += oSelectedAvaliacaoModel.getProperty("/impactoFinanceiro/value");
            vTotal += oSelectedAvaliacaoModel.getProperty("/origem/value");

            /*  Se maior que 62	                Alto
                Se maior que 49 e menor que 62	Médio
                Se menor que 49 	            Baixo*/
            if (vTotal < 49) {
                ocmbCriticidade.setSelectedKey(3);
            }
            else if (vTotal < 62) {
                ocmbCriticidade.setSelectedKey(2);
            } else {
                ocmbCriticidade.setSelectedKey(1);
            }


        },

        //navigation
        editStepClassProcess: function () {
            this._handleNavigationToStep(0);
        },
        editStepImpactoOper: function () {
            this._handleNavigationToStep(1);
        },
        editStepEsforco: function () {
            this._handleNavigationToStep(2);
        },
        editStepTempoAdaptacao: function () {
            this._handleNavigationToStep(3);
        },
        editStepAmadurecimentoTema: function () {
            this._handleNavigationToStep(4);
        },
        editStepImpactoFinanceiro: function () {
            this._handleNavigationToStep(5);
        },
        editStepOrigem: function () {
            this._handleNavigationToStep(6);
        },

        _handleNavigationToStep: function (iStepNumber) {
            var fnAfterNavigate = function () {
                this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
                this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
            }.bind(this);

            this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
            this.backToWizardContent();
        },

        backToWizardContent: function () {
            this._oNavContainer.backToPage(this._oWizardContentPage.getId());
        }


    });
});