const cds = require('@sap/cds');
const SapCfAxios = require('sap-cf-axios').default;
const destination = SapCfAxios('hierarquia_dest');
const axios = require('axios');
const qs = require('qs');


const SequenceHelper = require("./lib/SequenceHelper");
module.exports = cds.service.impl(async (service) => {
    const db = await cds.connect.to("db");
    const { Temas, Historico, Usuarios, ComissoesRepresentante, UsersExtensions, Perfis, PerfilAcoes, Comissoes, AppSettings, Reguladores } = service.entities;


    //Before Events
    service.before("READ", Temas, async (context) => {
        console.log("Context User: ", context.user);
        console.log("Context is Auth User: ", context.user.is('authenticated-user'));

    });

    service.before("CREATE", Temas, async (context) => {
        const temaId = new SequenceHelper({
            db: db,
            sequence: "TEMAS_ID",
            table: "REPRESENTACAOMERCADO_DB_TEMAS",
            field: "ID"
        });
        console.debug('Busca ID')
        context.data.ID = await temaId.getNextNumber();
        console.debug('ID:', context.data.ID)
        console.debug('Dados usuario logado:', context.user)

    });

    service.before("CREATE", Reguladores, async (context) => {
        const reguladorId = new SequenceHelper({
            db: db,
            sequence: "REGULADORES_ID",
            table: "REPRESENTACAOMERCADO_DB_REGULADORES",
            field: "ID"
        });
        context.data.ID = await reguladorId.getNextNumber();
    });

    service.before("CREATE", Comissoes, async (context) => {
        const comissaoId = new SequenceHelper({
            db: db,
            sequence: "COMISSOES_ID",
            table: "REPRESENTACAOMERCADO_DB_COMISSOES",
            field: "ID"
        });
        context.data.ID = await comissaoId.getNextNumber();
    });

    service.before("CREATE", Historico, async (context) => {
        const histTemaId = new SequenceHelper({
            db: db,
            sequence: "HISTORICO_ID",
            table: "REPRESENTACAOMERCADO_DB_HISTORICO",
            field: "ID"
        });

        context.data.ID = await histTemaId.getNextNumber();
        if (!context.data.ID) {
            context.data.ID = 1;
        }
        context.data.userAlteracao_ID = context.user.id;
        console.debug('Historico ID:', context.data.ID)

    });

    //On Events
    service.on("READ", Temas, async (context, next) => {
        const temas = await next();
        let usuario = {},
            aReturn = [],
            aUsers = [],
            aComissoesUsuario = [];

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: context.user.id });

        if (aUsers.length > 0) {
            usuario = aUsers[0];
            console.log("Usuario:", usuario);
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({ usuario_ID: usuario.ID });
        }

        switch (usuario.perfil_ID) {
            case "ADM":
            case "PRES":
                aReturn = temas;
                break;
            case "REP":
                //Representante somente visualiza Temas para as comissões que esta relacionado 
                aReturn = temas.filter(function (tema_el) {
                    return aComissoesUsuario.filter(function (comissUsuario_el) {
                        return comissUsuario_el.comissao_ID == tema_el.comissao_ID;
                    }).length > 0
                });
                break;
            case "VP_DIR":
                //visualização dos temas e painéis de sua responsabilidade               
                if (temas.length > 0 && temas[0].ID) {
                    aReturn = temas.find(tema => {
                        return tema.diretorGeral.toUpperCase() === usuario.nome.toUpperCase()
                    });
                }
                break;
            default:
                break;
        }

        return aReturn
    });

    service.on("READ", Comissoes, async (context, next) => {

        const comissoes = await next();
        let usuario = {},
            aReturn = [],
            aUsers = [],
            aComissoesUsuario = [];

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: context.user.id });

        if (aUsers.length > 0) {
            usuario = aUsers[0];
            console.log("Usuario:", usuario);
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({ usuario_ID: usuario.ID });
        }

        switch (usuario.perfil_ID) {
            case "ADM":
            case "PRES":
                aReturn = comissoes;
                break;
            case "REP":
            case "VP_DIR":
                //Representante somente visualiza as comissões que esta relacionado 
                aReturn = comissoes.filter(function (comissao_el) {
                    return aComissoesUsuario.filter(function (comissUsuario_el) {
                        return comissUsuario_el.comissao_ID == comissao_el.ID;
                    }).length > 0
                });
                break;
            default:
                break;
        }

        return aReturn



    });

    service.on("READ", UsersExtensions, async (context, next) => {
        console.log("USEREX", context.user.id);

        console.log("Key",context.data.ID);
        let aUsers = [],
            aUserProfile = [],
            oUserProfile = {},
            aPerfilAcoes = [],
            oPerfilAcao = {},
            oUser = {},
            aUsersEx = [],
            oUserEx = {
                ID: "",
                userProfile_ID: "",
                nomeColaborador: "",
                cargo: "",
                telefone: "",
                emailFuncionario: "",
                centroDeCustoColab: "",
                departamento: "",
                gerencia: "",
                centroDeCustoGerencia: "",
                coordenador: "",
                matriculaCoordenador: "",
                emailCoordenador: "",
                gerente: "",
                superintendencia: "",
                diretor: "",
                userProfile: {}
            }

        if(context.data.ID){
           oUserEx.ID =  context.data.ID; 
        }
        else{
            oUserEx.ID = context.user.id;
        }        
        
        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: oUserEx.ID  });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
            console.log("USUARIO:", oUser);
            //Busca Perfil do Usuário Logado
            aUserProfile = await cds.read(Perfis).where({ ID: oUser.perfil_ID });
            if (aUserProfile.length > 0) {
                oUserProfile = aUserProfile[0];
                console.log("PERFIL_USUARIO:", oUserProfile);
                //Busca Ações do Perfil
                aPerfilAcoes = await cds.read(PerfilAcoes).where({ ID: oUser.perfil_ID });
                if (aPerfilAcoes.length > 0) {
                    oPerfilAcao = aPerfilAcoes[0];
                    console.log("PERFIL_AÇÕES:", oPerfilAcao);
                    oUserEx.acoes = oPerfilAcao;
                    oUserEx.acoes_ID = oPerfilAcao.ID;
                }
            }
        
            oUserEx.ID = oUser.ID;
            oUserEx.userProfile_ID = oUserProfile.ID;
            oUserEx.nomeColaborador = oUser.nome;
            oUserEx.userProfile = oUserProfile;
            oUserEx.cargo = oUser.cargo;
            oUserEx.telefone = oUser.telefone;
            oUserEx.diretor = oUser.diretorGeral;
            oUserEx.diretorGeral = oUser.diretorGeral;
            oUserEx.superintendencia = oUser.diretorExecutivo; 
            oUserEx.diretorExecutivo = oUser.diretorExecutivo; 
        }             

        //############## Chama Api de Hierarquia #################################
         //Busca dados Usuário logado
         let oAppSettings ={};
        const aAppSettings = await cds.read(AppSettings).where({ ID: 1 });
        if ( aAppSettings.length > 0) {
            oAppSettings = aAppSettings[0];
        }

        console.log("App Settings>>>>", oAppSettings);

        //Busca Token       
        let ret_token = "",
            matricula = "";
            const re = /\S+@\S+\.\S+/;

            if(re.test(oUserEx.ID)){
                matricula = oUser.matricula;
            }else{
                matricula = oUserEx.ID;                
            }     


         ret_token = await axios({
            method: 'post',
            url: oAppSettings.urlToken,
            headers: {
                'Content-Type': "application/x-www-form-urlencoded"
            },
            data: qs.stringify({
                client_id: oAppSettings.clientID,
                client_secret: oAppSettings.clientSecret,
                grant_type: "client_credentials"
            })
        }).then(function (response) {
            console.log("FUNCIONOU?: ", response.data.access_token);
            return response.data.access_token;

        }).catch(function (error) {
            console.log("Chamei, mas deu erro =(", error);
        });
        //Chama API de Hierarquia

        const ret_api_hierarquia = await
            axios({
                method: 'get',
                url: `${oAppSettings.urlApi}?login=${matricula}`,
                headers: {
                    'Authorization': `Bearer ${ret_token}`
                }
            }).then(function (response) {
                console.log("Chamou API de Hierarquia com Token?: ", response.data); 
               return  response.data;
            }).catch(function (error) {
                console.log("Erro na Busca de Hierarquia:", error);
            });
       
        //Complementa dados Usuário com retorno Api de Hierarquia
        if( ret_api_hierarquia.nomeColaborador){
            oUserEx.nomeColaborador = ret_api_hierarquia.nomeColaborador;                
            oUserEx.cargo = ret_api_hierarquia.cargo;                
            oUserEx.diretor = ret_api_hierarquia.diretor;
            oUserEx.gerencia = ret_api_hierarquia.gerencia;
            oUserEx.superintendencia = ret_api_hierarquia.superintendencia;           
            oUserEx.diretorGeral =  ret_api_hierarquia.diretor;           
            oUserEx.diretorExecutivo = ret_api_hierarquia.superintendencia; 
        }       
         console.log("Retorno:",oUserEx);
        if(context.data.ID){
            return oUserEx;
        }
        else{
             aUsersEx.push(oUserEx);           
            return aUsersEx;
        }
       
        //################################################################ 

    });

});



