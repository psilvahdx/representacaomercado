// @ts-nocheck
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

	return BaseController.extend("ps.uiRepMercado.controller.UsuariosList", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel;

			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				usuariosTableTitle : this.getResourceBundle().getText("usuariosTableTitle"),				
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
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
            
                if(oObject.userLog.userProfile_ID !== "ADM"){
            	    this.getRouter().navTo("temasList");
                }              
           
        },
        
        getUserData: function(){
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getModel("userLogModel"),
                that = this;
           if(!oObject.getProperty("/userLog/ID")){
                oModel.read("/UsersExtensions", {
                    urlParameters: {
                            "$expand": "userProfile,acoes"
                        },
                    success: function (oData) {                    
                        oObject.setProperty("/userLog",oData.results[0]);      
                        //that.getComissoes(oObject.getProperty("/userLog/ID"));               
                    },
                    error: function (oError) {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }
            
        },

        /*getComissoes: function(sUserID){

            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),              
                that = this,
                sPath = "/Usuarios('" + sUserID + "')/comissoes";

            if (sUserID) {              

                oModel.read(sPath, {
                    urlParameters: {
                        "$expand": "comissao"
                    },
                    success: function (oData) {
                        var oCommissoesModel = new JSONModel(oData);
                        oView.setModel(oCommissoesModel, "userComissoesModel");  
                    },
                    error: function (oError) {

                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_comissoes_erro"));
                    }

                });
            }
        },*/

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
		onUpdateFinished : function (oEvent) {
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
        
        onCreatePress: function(oEvent){
           this.getRouter().navTo("detalheUsuario", {
				idUser: "New"
			}); 
        },

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onTableItemPress : function (oEvent) {
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
            
                if(oFilterUser.ID){
                    oFilter = new Filter("ID", FilterOperator.EQ, oFilterUser.ID);
				    aFilter.aFilters.push(oFilter);
                }
                 if(oFilterUser.nome){
                    oFilter = new Filter("nome", FilterOperator.Contains, oFilterUser.nome);
				    aFilter.aFilters.push(oFilter);
                }
                if(oFilterUser.matricula){
                    oFilter = new Filter("matricula", FilterOperator.Contains, oFilterUser.matricula);
				    aFilter.aFilters.push(oFilter);
                }
                if (oFilterUser.perfil) {
                    for (let i = 0; i < oFilterUser.perfil.length; i++) {
                        var perfil_ID = oFilterUser.perfil[i];
                        oFilter = new Filter("perfil_ID", FilterOperator.EQ, perfil_ID);
				        aFilter.aFilters.push(oFilter); 
                    }
                    
                }
                /*if (oFilterTema.comissoes) {
                    for (let i = 0; i < oFilterTema.comissoes.length; i++) {
                        var comissao_ID = oFilterTema.comissoes[i];
                        oFilter = new Filter("comissao_ID", FilterOperator.EQ, comissao_ID);
				        aFilter.aFilters.push(oFilter); 
                    }
                    
                }*/

            return aFilter;
        },


		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
			
				this.onRefresh();
			} else {
                var aTableSearchState = [],
                    filterModel = this.getModel("filterModel"),
                    oTable = this.byId("tblUsers"),
				    oBinding = oTable.getBinding("items"),			
                    oFilterUsuarios= filterModel.getProperty("/usuarios"),
                    aSelKeysPerfil = this.byId("mtCBoxPerfil").getSelectedKeys();
                    //aSelKeysComis = this.byId("mtCBoxComissoes").getSelectedKeys(); 
                    if(aSelKeysPerfil && aSelKeysPerfil.length > 0 ){
                         oFilterUsuarios.perfil = aSelKeysPerfil;
                    }else{
                        oFilterUsuarios.perfil = [];
                    }  
                   /* if(aSelKeysComis && aSelKeysComis.length > 0 ){
                         oFilterTemas.comissoes = aSelKeysComis;
                    }else{
                        oFilterTemas.comissoes = [];
                    }   */                   
                   
                aTableSearchState = this.buildFilters(oFilterUsuarios);
                oBinding.filter(aTableSearchState.aFilters);               
			}

        },     

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("tblUsers");
			oTable.getBinding("items").refresh();
		},       

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
        _onPageNavButtonPress: function(oEvent){
             history.go(-1);
        }
	});
});