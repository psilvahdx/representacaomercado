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

    return BaseController.extend("ps.uiRepMercado.controller.DetalhesUsuario", {

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
                busy: false,
                delay: 0,
                isEditMode: true
            });
            this.getRouter().getRoute("detalheUsuario").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detUserView");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */
        _onPageNavButtonPress: function (oEvent) {
            history.go(-1);
        },

        onCancel: function (oEvent) {
            var oViewModel = this.getView().getModel("detUserView");
            oViewModel.setProperty("/isEditMode", true);
            history.go(-1);
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
            var sObjectId = oEvent.getParameter("arguments").idUser;
            this.initializeValidator();
            if (sObjectId !== "New") {
                this._bindView("/Usuarios('" + sObjectId + "')");               
            }
            else {    
                this.byId("btnAddComissoes").setVisible(false);            
                this.getView().setModel(new JSONModel(this.getUsuarioTemplate()), "EditUsuarioModel");
                //this.getComissoesRepresentante();
               
            }

        },     

        initializeValidator: function(){

            var txtIdUser = this.byId("txtIdUser"),
                cmbPerfil =  this.byId("txtIdUser");			

            txtIdUser.setValueState("None");
            cmbPerfil.setValueState("None");
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
                oViewModel = this.getModel("detUserView");

            oModel.read(sObjectPath, {
                urlParameters: {
                    "$expand": "perfil,comissoes($expand=comissao)"
                },
                success: function (oData) {
                    var oEditUsuarioModel = new JSONModel(oData);
                    that.getView().setModel(oEditUsuarioModel, "EditUsuarioModel");
                    that.byId("btnAddComissoes").setVisible(true);
                },
                error: function (oError) {

                }
            });

        },
        
        onInputIdChange: function(oEvent){
            var sNewValue = oEvent.getParameter("value");
             var oView = this.getView(),                
                oModel = this.getModel(), 
                oViewModel = this.getView().getModel("detUserView"),                
                oObject = this.getModel("EditUsuarioModel").getData(),
                that = this;                 
           
           if(sNewValue.length >= 8){
                oViewModel.setProperty("/busy", true);
                oModel.read(`/UsersExtensions('${sNewValue}')`, {                 
                    success: function (oData) {                    
                       // oObject.setProperty("/userLog",oData.results[0]); 
                        oObject.nome = oData.nomeColaborador;
                        oObject.telefone = oData.telefone;
                        oObject.cargo  = oData.cargo;
                        oObject.diretorGeral   = oData.diretorGeral;
                        oObject.diretorExecutivo = oData.diretorExecutivo;
                        that.getModel("EditUsuarioModel").refresh();
                        oViewModel.setProperty("/busy", false);
                        if(oData.userProfile_ID && oData.userProfile_ID !=="" ){
                            that._bindView("/Usuarios('" + oData.ID + "')");
                        }
                                      
                    },
                    error: function (oError) {
                        oViewModel.setProperty("/busy", false);
                    }

                });
            }
        },

        getComissoesRepresentante: function () {
            this.openDialogComissao(null);
        },       

        /**         
         * Fragment Comissoes
         */

        openDialogComissao: function (oEvent) {
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),                
                that = this,
                sPath = "/Comissoes";            

                this.oDialogComissaoRepresentante = this.getDialogComissao("ps.uiRepMercado.view.fragments.ComissoesRepresentante");

                oModel.read(sPath, {                   
                    success: function (oData) {
                        var oCommissoesModel = new JSONModel(oData);
                        oView.setModel(oCommissoesModel, "comissoesRepModel");                       
                         that._oDialogComissaoRepresentante.open(); 
                    },
                    error: function (oError) {

                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_comissoes_erro"));
                    }

                });
            
        },

        getDialogComissao: function (sFragment) {
            if (!this._oDialogComissaoRepresentante) {
                this._oDialogComissaoRepresentante = sap.ui.xmlfragment(sFragment, this);
                this.getView().addDependent(this._oDialogComissaoRepresentante);
            }

            return this._oDialogComissaoRepresentante;
        },

        _onDefineComissaoPress: function (oEvent) {
            var oSelContexts = oEvent.getParameter("selectedContexts"),
                editModel = this.getModel("EditUsuarioModel"),
                editData = editModel.getData(),
                aComissoesRepresentante = [];

                if( oSelContexts.length > 0) {
                    for (var i = 0; i < oSelContexts.length; i++) {
					        var oPath = oSelContexts[i].getPath();
					        var oComissao = oSelContexts[i].getObject(oPath);
                            var oComissaoRepresentante ={
                                 comissao_ID: oComissao.ID,
                                 usuario_ID: editData.ID
                            }

                        //aComissoesRepresentante.push(oComissaoRepresentante);
                        this.sendComissoesUsuarioRequest(oComissaoRepresentante);

                    }
                    //this.sendComissoesUsuarioRequest(aComissoesRepresentante, editData.ID);
                    this._bindView("/Usuarios('" + editData.ID + "')"); 
                    
                }
           
            //this.getReguladorPorComissao(editData.comissao_ID);
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

        getViewEntity: function () {
            var oObject = this.getView().getModel("EditUsuarioModel").getData(),
                oView = this.getView(),
                oParams = {
                    ID: oObject.ID,
                    nome      : oObject.nome,
                    telefone  : oObject.telefone,
                    cargo     : oObject.cargo,
                    diretorGeral     : oObject.diretorGeral,
                    diretorExecutivo : oObject.diretorExecutivo,
                    perfil_ID : oObject.perfil_ID                   
                };          

            return oParams;
        },

        getUsuarioTemplate: function () {

            var oParams = {
                    ID : "",
                    nome :"",
                    telefone :"",
                    cargo : "",
                    diretorGeral:"",
                    diretorExecutivo:"",
                    perfil_ID : "",
                    peril: {
                        ID: "",
                        descricao: ""
                    },
                    comissoes: []

                };  
            
            return oParams;
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

			if (!this._validateField("txtIdUser"))
				isValid = false;

			if (!this._validateField("cmbPerfil"))
				isValid = false;

			return isValid;
        },

        onNewComissaoPress: function(oEvent){
            this.openDialogComissao(oEvent);
        },

        onTableItemDelete: function(oEvent){

             var that = this,
                sMessage = "",
                oContext = oEvent.getParameter("listItem").oBindingContexts,
                sDeletePath = oContext.EditUsuarioModel.getPath(),
                oDeleteObject = this.getModel("EditUsuarioModel").getObject(sDeletePath),
                oViewModel = this.getModel("detUserView"),
                entitySet = "/ComissoesRepresentante";  

                entitySet = entitySet + "(ID=" + oDeleteObject.ID + ",comissao_ID="+oDeleteObject.comissao_ID+",usuario_ID='"+oDeleteObject.usuario_ID+"')";

                //Notifica que relacionamento entre Usuário e Comissão será removido
                    sMessage = that.getResourceBundle().getText("confirma_exclusao_comissao_usario_txt",[oDeleteObject.comissao.descricao]);
                    MessageBox.information(
                        sMessage,
                        {
                            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                            onClose: function (sAction) {
                                if (sAction === MessageBox.Action.YES) {
                                    that.deleteComissaoRepresentante(entitySet,oDeleteObject.usuario_ID);
                                }
                            }
                        });   
            

        },

        deleteComissaoRepresentante: function(entitySet,pIdUsuario){

             var oModel = this.getModel(),
                 that = this,
                 sIdUsuario = pIdUsuario;

            oModel.remove(entitySet, {
                        success: function (oData) {
                            that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_excluir_comissao_usuario"));                           
                            that.getView().getModel("EditUsuarioModel").refresh();
                             oModel.refresh();
                            that._bindView("/Usuarios('" + sIdUsuario + "')");  
                        },
                        error: function (oError) {
                            that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_excluir_comissao_usuario"));
                            that.getView().getModel("EditUsuarioModel").refresh();
                            oModel.refresh();
                        }
            });

        },

        onSaveButtonPress: function(oEvent){

             var that = this,
                oParams = this.getViewEntity(),
                oViewModel = this.getModel("detUserView"),
                entitySet = "/Usuarios";  
                
                if(this.validaInformacoes()){
                    oViewModel.setProperty("/busy", true);
                    if (oParams.ID === "") {
                        //Novo Usuário
                        this.saveUsuario(oParams,oViewModel,entitySet);
                    }
                    else{
                        //Atualiza Usuário
                        this.updateUsuario(oParams,oViewModel,entitySet);
                    }
                }            
              

        },        

        saveUsuario: function(oParams, oViewModel, entitySet){
            var sMessage = "",
                oModel = this.getModel(),
                that = this;            
               
            this.sendCreateUsuarioRequest(entitySet,oParams);                               

        },

        updateUsuario: function(oParams, oViewModel, entitySet){
            var sMessage = "",
                that = this;

            entitySet = entitySet + "(ID='" + oParams.ID + "')";   
            this.sendUpdateUsuarioRequest(entitySet, oParams);
                        
            
        },

        sendCreateUsuarioRequest: function (entitySet, oParams) {

            var oModel = this.getModel(),
                oViewModel = this.getModel("detUserView"),
                that = this;
           
            oModel.create(entitySet, oParams, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_usuario"));
                    oParams.ID = oData.ID;             
                     oViewModel.setProperty("/busy", false);       
                    that.saveComissoesUsuario(oParams);
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_usuario"));
                     oViewModel.setProperty("/busy", false);
                    oModel.refresh();
                }
            });
        },

        sendUpdateUsuarioRequest: function(entitySet, oParams){

             var oModel = this.getModel(),
                 oViewModel = this.getModel("detUserView"),
                 that = this;

            oModel.update(entitySet, oParams, {
                        success: function (oData) {
                            that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_usuario"));
                            oViewModel.setProperty("/busy", false);                           
                            that.saveComissoesUsuario(oParams);
                        },
                        error: function (oError) {
                            that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_usuario"));
                            oViewModel.setProperty("/busy", false);

                            oModel.refresh();
                        }
                    });

        },

        saveComissoesUsuario: function (oParams) {
            var oModel = this.getModel(),
                that = this;
                oModel.refresh();

             this.byId("btnAddComissoes").setVisible(true);   
        },

        sendComissoesUsuarioRequest: function(oParams){
             var oModel = this.getModel(),
                that = this;                
            oModel.create("/ComissoesRepresentante", oParams, {
                success: function (oData) {
                    oModel.refresh();                                       
                },
                error: function (oError) {
                    oModel.refresh();
                }
            });
        }
    });
});