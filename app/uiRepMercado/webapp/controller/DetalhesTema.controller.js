sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator) {
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
		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page shows busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
					busy : true,
                    delay : 0,
                    isEditMode: true
				});
			this.getRouter().getRoute("detalheTema").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "objectView");
		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
        _onPageNavButtonPress: function(oEvent){
            history.go(-1);           
        },	
        
        onCancel: function(oEvent){
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
        
        onTogglePress: function (oEvent){
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
		_onObjectMatched : function (oEvent) {
			var sObjectId =  oEvent.getParameter("arguments").idTema;
            
            if(sObjectId !== "New"){
                this._bindView("/Temas(" + sObjectId + ")");
                this.filterHistorico(sObjectId);
            }
            else{                
                this.getView().setModel(new JSONModel(this.getTemaTemplate()), "EditTemaModel");
                this.filterHistorico(null);
            }
            
        },

        filterHistorico: function(idTema){
            var lstHistorico = this.byId("lstHistorico"),                
                oBinding = lstHistorico.getBinding("items"),
                aFilter = new Filter([]),
			    oFilter = {};            
                
            oFilter = new Filter("idTema", FilterOperator.EQ, idTema);
            aFilter.aFilters.push(oFilter); 
            oBinding.filter(aFilter.aFilters);           
                		
        },

        onHistListItemPress: function(oEvent){
            var oContext = oEvent.getSource().getBindingContext(),
                oViewModel = this.getView().getModel("objectView"),
                lstHistorico = this.byId("lstHistorico"),
                oObject = this.getModel().getObject(oContext.getPath());
            this._bindView("/Historico(" + oObject.ID + ")");

            oViewModel.setProperty("/isEditMode",false);
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
		_bindView : function (sObjectPath) {
            var oModel = this.getModel(),
                that = this,
                oViewModel = this.getModel("objectView");
            
            oModel.read(sObjectPath, {
                urlParameters: {
					"$expand": "representante,comissao"
				},
				success: function (oData) {
					var oEditTemaModel = new JSONModel(oData);
                    that.getView().setModel(oEditTemaModel, "EditTemaModel");
                     //that.getView().getModel("EditTemaModel").refresh();
				},
				error: function (oError) {
					
				}
			});

        },

        /**         
         * Fragment Comissoes
         */

        openDialogComissao: function(oEvent){
            var oView = this.getView(),
			    oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getView().getModel("EditTemaModel").getData(),
				that = this;
			this.oDialogComissao = this.getDialogComissao("ps.uiRepMercado.view.fragments.Comissoes");
		
				oModel.read("/Comissoes", {

					success: function (oData) {

						var oCommissoesModel = new JSONModel(oData);
						oView.setModel(oCommissoesModel, "comissoesModel");						
						that._oDialogComissao.open();
					},
					error: function (oError) {
						
						oOwnerComponent._genericErrorMessage(that.geti18nText("load_comissoes_erro"));
					}

				});
			
        },

        getDialogComissao: function (sFragment) {
			if (!this._oDialogComissao) {
				this._oDialogComissao = sap.ui.xmlfragment(sFragment, this);
				this.getView().addDependent(this._oDialogComissao);
			}

			return this._oDialogComissao;
        },
        
        _onDefineComissaoPress: function(oEvent){
            	var oSelItem = oEvent.getParameter("selectedItem"),
				editModel = this.getModel("EditTemaModel"),
				editData = editModel.getData();

			var oComissao = this.getModel("comissoesModel").getObject(oSelItem.getBindingContextPath());
                editData.comissao_ID = oComissao.ID;
                editData.comissao.descricao = oComissao.descricao;
                editModel.refresh();
        },

        _onSearchComissoes: function(oEvent){
            
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

        openDialogRepresentante: function(oEvent){
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
        
        _onDefineRepresentantePress: function(oEvent){
            	var oSelItem = oEvent.getParameter("selectedItem"),
				editModel = this.getModel("EditTemaModel"),
				editData = editModel.getData();

			var oRepresentante = this.getModel("representanteModel").getObject(oSelItem.getBindingContextPath());
                editData.representante_ID = oRepresentante.ID;
                editData.representante.nome = oRepresentante.nome;
                editData.representante.cargo = oRepresentante.cargo;
                editData.representante.telefone = oRepresentante.telefone;
                editModel.refresh();
        },

        _onSearchRepresentante: function(oEvent){
            
            var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"nome",
				FilterOperator.Contains,
				sValue
			);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([oFilter]);
        },

        getViewEntity: function(){
            var oObject = this.getView().getModel("EditTemaModel").getData(),
            	oView = this.getView(),
                oParams =  {
                    ID: oObject.idTema? oObject.idTema : oObject.ID,
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

        getTemaTemplate: function(){

            var oFilterData = this.getModel("filterModel").getData();

            var  oParams =  {
                    ID: "",
                    comissao_ID:"",
                    criticidade_ID: "",
                    dataUltimaReuniao: "",
                    descricao: "",
                    detalheDiscussao: "",
                    diretorExecutivo: "",
                    diretorGeral: "",
                    primeiroRegistro: new Date(),
                    principaisImpactos: "",
                    regulador_ID: "",
                    representante_ID: "",
                    status_ID: "",
                    ultimoRegistro: "",
                    representante:{
                        ID: "",
                        matricula: "", 
                        nome:"",
                        cargo:"",
                        telefone:""
                    },
                    comissao:{
                        ID:"",
                        descricao:""
                    }
                };
            
            if(oFilterData.temas.tema !== ""){
                oParams.descricao = oFilterData.temas.tema; 
            }

            return oParams;
        },

        onSave: function(oEvent){
             var oModel = this.getModel(),
                that = this,
                oParams = this.getViewEntity(),
                oViewModel = this.getModel("objectView"),
                entitySet = "/Temas";
            
            if (oParams.ID ==="") {
                //novo tema
                delete oParams.ID;
               oModel.create(entitySet, oParams, {
				success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_tema"));
                    //oModel.refresh();
                    //that._bindView("/Temas(" + oData.ID + ")");
                    oParams.idTema = oData.ID;
                    that.saveHistorico(oParams);
				},
				error: function (oError) {
					that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tema"));
					
					oModel.refresh();
				}
            }); 
            }
            else{
                //Atualiza Tema
                entitySet = entitySet + "(ID="+ oParams.ID +")";
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
            }           

        },
        saveHistorico: function(oParams){
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