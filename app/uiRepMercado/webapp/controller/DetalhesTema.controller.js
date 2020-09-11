sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox) {
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
            
            try{
                if (oEvent.getSource().getPressed()) {
				    oToggleButton.setText(this.geti18nText("voltar_txt"));
			    } else {
				    oToggleButton.setText(this.geti18nText("historico_txt"));
			}

            }
            catch(oError){
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

            if (sap.ui.Device.system.phone) {
                 oToggleButton.setVisible(true);
            }else{
               oToggleButton.setVisible(false);  
            }
                            
            this.initializeValidator();
            if (sObjectId !== "New") {
                this._bindView("/Temas(" + sObjectId + ")");
                this.filterHistorico(sObjectId);
            }
            else {
                this.getView().setModel(new JSONModel(this.getTemaTemplate()), "EditTemaModel");
                this.filterHistorico(null);
                this.getComissoesRepresentante();               
            }

        },
        
         initializeValidator: function(){

            var txtDescTema = this.byId("txtDescTema"),
                cmbCriticidade =  this.byId("cmbCriticidade");

            txtDescTema.setValueState("None");
            cmbCriticidade.setValueState("None");
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
            this._bindView("/Historico(" + oObject.ID + ")");

            oViewModel.setProperty("/isEditMode", false);
            if (lstHistorico.getItems()[0]._active) {
                oViewModel.setProperty("/isEditMode", true);
            }
            oViewModel.refresh();
            this.onTogglePress(oEvent);
        },

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
        _bindView: function (sObjectPath) {
            var oModel = this.getModel(),
                that = this,
                oViewModel = this.getModel("objectView");

            oModel.read(sObjectPath, {
                urlParameters: {
                    "$expand": "representante,comissao,regulador"
                },
                success: function (oData) {
                    var oEditTemaModel = new JSONModel(oData);
                    that.getView().setModel(oEditTemaModel, "EditTemaModel");
                },
                error: function (oError) {

                }
            });

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
                        if (oData.results.length > 1 && oEvent) {
                            that._oDialogComissao.open();
                        } else {
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

        createFilter: function(key, value, operator, useToLower) {
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
                diretorExecutivo:  oUserModel.userLog.diretorExecutivo,
                diretorGeral:  oUserModel.userLog.diretorGeral,
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

        _validateField: function(fieldName) {

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
            
            var isValid = true;

			if (!this._validateField("txtDescTema"))
				isValid = false;

			if (!this._validateField("cmbCriticidade"))
				isValid = false;

			return isValid;
        },

        onSaveButtonPress: function(oEvent){

             var that = this,
                oParams = this.getViewEntity(),
                oViewModel = this.getModel("objectView"),
                entitySet = "/Temas";  
                
                if(this.validaInformacoes()){

                    if (oParams.ID === "") {
                        //Novo Tema
                        this.saveTema(oParams,oViewModel,entitySet);
                    }
                    else{
                        //Atualiza Tema
                        this.updateTema(oParams,oViewModel,entitySet);
                    }
                }            
              

        },        

        saveTema: function(oParams, oViewModel, entitySet){
            var sMessage = "",
                oModel = this.getModel(),
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
                                    that.sendCreateTemaRequest(entitySet,oParams);
                                }
                            }
                        });

                    }else{
                        that.sendCreateTemaRequest(entitySet, oParams);

                    }
                },
                error: function (oError) {

                }

            });


        },

        updateTema: function(oParams, oViewModel, entitySet){
            var sMessage = "",
                that = this;

            entitySet = entitySet + "(ID=" + oParams.ID + ")";
            sMessage = this.getResourceBundle().getText("confirma_status_tema_txt");

            if (oParams.status_ID === 1) {//Status Novo
                    MessageBox.information(
                        sMessage,
                        {
                            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                            onClose: function (sAction) {
                                if (sAction === MessageBox.Action.YES) {                                    
                                    that.sendUpdateTemaRequest(entitySet, oParams);
                                }
                            }
                        });
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
                    that.saveHistorico(oParams);
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tema"));

                    oModel.refresh();
                }
            });
        },

        sendUpdateTemaRequest: function(entitySet, oParams){

             var oModel = this.getModel(),
                 that = this;

            oModel.update(entitySet, oParams, {
                        success: function (oData) {
                            that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_tema"));
                            oParams.idTema = oData.ID;
                            that.saveHistorico(oParams);
                        },
                        error: function (oError) {
                            that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tema"));

                            oModel.refresh();
                        }
                    });

        },

        saveHistorico: function (oParams) {
            var oModel = this.getModel(),
                that = this;
            delete oParams.ID;
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
        }
    });
});