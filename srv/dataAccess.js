const cds = require('@sap/cds');
const SapCfAxios = require('sap-cf-axios').default;
const destination = SapCfAxios('ODATA_COLABORADORES');
const axios = require('axios');
const qs = require('qs');

const SequenceHelper = require("./lib/SequenceHelper");
module.exports = cds.service.impl(async (service) => {
    const db = await cds.connect.to("db");
    const { Temas,
        Historico,
        Usuarios,
        ComissoesRepresentante,
        UsersExtensions,
        Perfis,
        PerfilAcoes,
        Comissoes,
        AppSettings,
        Reguladores,
        CargoClassificacoes,
        TiposAlerta,
        AlertasUsuario } = service.entities;


    //Before Events
    service.before("READ", Temas, async (req) => {
        let aUsers = [],
            usuario = {},
            aComissoesUsuario = [],
            acomissoesIds = [],
            xprComissoesIds = {};

        const { SELECT } = req.query

        //console.log("Query>>>>",req.query);

        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({ usuario_ID: usuario.ID });
            acomissoesIds = aComissoesUsuario.map(x => x.comissao_ID);
            if (acomissoesIds.length > 0) {
                const inComissoesID = `comissao_ID in (${acomissoesIds.join(',')})`;
                console.log("Comissoes ID", inComissoesID);
                xprComissoesIds = cds.parse.expr(inComissoesID);
            }
        }

        switch (usuario.perfil_ID) {
            case "REP":

                if (SELECT.where) {
                    //Realizou filtro na tela
                    console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where.push(...['and', '(', xprComissoesIds, ')']);
                        console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where = [{ ref: ['status_ID'] },
                            '<>',
                        { val: 4 }, 'and', '(', xprComissoesIds, ')'];

                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }

                }

                break;
            case "VP_DIR":
                //visualização dos temas e painéis de sua responsabilidade
                if (SELECT.where) {
                    //Realizou filtro na tela
                    console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where.push(...['and', '(', xprComissoesIds, 'or',
                            '(', { func: 'upper', args: [{ ref: ['diretorGeral'] }] },
                            'like',
                            { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            'or',
                            { func: 'upper', args: [{ ref: ['diretorExecutivo'] }] },
                            'like',
                            { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            ')', ')']);
                        console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where.push(...['and', '(', { func: 'upper', args: [{ ref: ['diretorGeral'] }] },
                            'like',
                            { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            'or',
                            { func: 'upper', args: [{ ref: ['diretorExecutivo'] }] },
                            'like',
                            { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            ')']);
                        console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where = [{ ref: ['status_ID'] },
                            '<>',
                        { val: 4 }, 'and', '(', xprComissoesIds,
                            'or',
                            '(', { func: 'upper', args: [{ ref: ['diretorGeral'] }] },
                            'like',
                        { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            'or',
                        { func: 'upper', args: [{ ref: ['diretorExecutivo'] }] },
                            'like',
                        { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            ')', ')'];

                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where = ['(', { func: 'upper', args: [{ ref: ['diretorGeral'] }] },
                            'like',
                            { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            'or',
                            { func: 'upper', args: [{ ref: ['diretorExecutivo'] }] },
                            'like',
                            { func: 'concat', args: ['\'%\'', { val: usuario.nome.toUpperCase() }, '\'%\''] },
                            ')', 'and',
                            { ref: ['status_ID'] }, '<>', { val: 4 }];//Somente Temas em Aberto
                    }


                }

                break;
            case "ADM":
            case "PRES":
                console.log("Adm/Pres", SELECT.where);
                break;
            default:
                req.reject(404, "Usuário não autorizado");
                break;
        }


    });

    service.before("READ", AlertasUsuario, async (req) => {
        let aUsers = [],
            usuario = {};

        const { SELECT } = req.query;

        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
        }

        if (!SELECT.where) {
            SELECT.where = [{ ref: ['usuario_ID'] },
                '=',
            { val: usuario.ID },];
        }

    });

    service.before("READ", TiposAlerta, async (req) => {
        let aUsers = [],
            usuario = {};

        const { SELECT } = req.query;

        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
        }

        if (usuario.perfil_ID !== "ADM") {
            if (!SELECT.where) {
               /* SELECT.where = [{ ref: ['perfil_ID'] },
                    '=',
                { val: usuario.perfil_ID },
                    'and',
                   { ref: ['perfil_ID'] },
                    '=',
                { val: null }];*/
                const where = `perfil_ID ='${usuario.perfil_ID}' or perfil_ID = 'null' `;
               //console.log("SELECT.where xpr", xpr);
               const expr = cds.parse.expr(where);
                SELECT.where =  expr.xpr;
            }
            console.log("SELECT.where Tipos Alertas", SELECT.where);
        }



    });

    service.before("TemasPorRegulador", async (req) => {

        const { SELECT } = req.query;
        console.log("SELECT Temas por Regulador: >>>>", SELECT);

        if (SELECT.where) {
            console.log("Sem Filtros", SELECT.query);
        } else {
            console.log("Com Filtros", SELECT.query);
        }

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

        console.log("USUARIO >>>>>>>>>", context.user.id);
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

    /* service.before("CREATE", TiposAlerta, async (context) => {
        const TtipoAlertaId = new SequenceHelper({
            db: db,
            sequence: "TIPOS_ALERTA_ID",
            table: "REPRESENTACAOMERCADO_DB_TIPOS_ALERTA",
            field: "ID"
        });

        context.data.ID = await TtipoAlertaId.getNextNumber();
        if (!context.data.ID) {
            context.data.ID = 1;
        }
        //context.data.userAlteracao_ID = context.user.id;
        console.debug('TIPOS_ALERTA_ID:', context.data.ID)

    });*/

    /*service.before("UPDATE", Usuarios, async (context) => {

        let usuario = {},
            aUsers = [];

        //Busca dados Usuário logado
        console.log(context.user);
        aUsers = await cds.read(Usuarios).where({ ID: context.user.id });

        if (aUsers.length > 0) {
            usuario = aUsers[0];
            console.log(usuario);
            if (usuario.perfil_ID !== "ADM") {
                context.reject(403, "Usuário não autorizado");
            }
        } else {
            context.reject(403, "Usuário não autorizado");
        }
    });*/

    //On Events  
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

        console.log("Key", context.data.ID);
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

        if (context.data.ID) {
            oUserEx.ID = context.data.ID;
        }
        else {
            oUserEx.ID = context.user.id;
        }

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: oUserEx.ID });
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
        let oAppSettings = {};
        const aAppSettings = await cds.read(AppSettings).where({ ID: 1 });
        if (aAppSettings.length > 0) {
            oAppSettings = aAppSettings[0];
        }

        console.log("App Settings>>>>", oAppSettings);

        //Busca Token       
        let ret_token = "",
            matricula = "";
        const re = /\S+@\S+\.\S+/;

        if (re.test(oUserEx.ID)) {
            matricula = oUser.matricula;
        } else {
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
                return response.data;
            }).catch(function (error) {
                console.log("Erro na Busca de Hierarquia:", error);
            });

        //Complementa dados Usuário com retorno Api de Hierarquia
        if (ret_api_hierarquia && ret_api_hierarquia.nomeColaborador) {
            oUserEx.nomeColaborador = ret_api_hierarquia.nomeColaborador;
            oUserEx.cargo = ret_api_hierarquia.cargo;
            oUserEx.diretor = ret_api_hierarquia.diretor;
            oUserEx.gerencia = ret_api_hierarquia.gerencia;
            oUserEx.superintendencia = ret_api_hierarquia.superintendencia;
            oUserEx.diretorGeral = ret_api_hierarquia.diretor;
            oUserEx.diretorExecutivo = ret_api_hierarquia.superintendencia;
        }
        console.log("Retorno:", oUserEx);
        if (context.data.ID) {
            return oUserEx;
        }
        else {
            aUsersEx.push(oUserEx);
            return aUsersEx;
        }

        //################################################################ 

    });

    /*service.on("getUserExtension", async req => {

        console.log("Key", req.data.ID);
        let sPath = `/xsodata/workflows.xsodata/EmpregadosSet('${req.data.ID}')`,
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
            };

        try {
            const response = await destination({
                method: "get",
                url: sPath,
                headers: {
                    "content-type": "application/json"
                }
            });

            console.log("ODATA_COLABORADORES_DESTINATION_RESPONSE", response.data);

        } catch (error) {
            console.log("ERRO", error)
        }


        //console.log("Response", response);        

        return oUserEx;

    });*/

    service.on("comissoesSemRepresentante", async req => {

        let aReturn = [];

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        console.log("Comissoes com Representante", aComissoesComRep.length)

        for (let i = 0; i < aComissoes.length; i++) {
            const element = aComissoes[i];

            const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

            if (!find) {
                aReturn.push(element);
            }
        }

        console.log("Comissoes SEM Representante", aReturn.length)


        return aReturn;
    });


    service.on("comissoesComRepresentante", async req => {

        let aReturn = [];

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        console.log("Comissoes com Representante", aComissoesComRep.length)

        for (let i = 0; i < aComissoes.length; i++) {
            const element = aComissoes[i];

            const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

            if (find) {
                aReturn.push(element);
            }
        }

        //console.log("Comissoes SEM Representante", aReturn.length)


        return aReturn;
    });



    service.on("representacoesMercado", async req => {

        let aReturn = [];

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante),
            aReguladores = await cds.read(Reguladores);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        console.log("Comissoes com Representante", aComissoesComRep.length)

        for (let i = 0; i < aComissoes.length; i++) {
            const element = aComissoes[i];
            var oReturn = {};

            oReturn.ID = element.ID;
            oReturn.comissao = element.descricao;

            if (element.regulador_ID) {
                const oRegulador = aReguladores.find(r => r.ID === element.regulador_ID);
                oReturn.regulador = oRegulador.descricao;
            } else {
                oReturn.regulador = "OUTROS";
            }

            const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

            if (find) {

                oReturn.comIndicacao = true;

            } else {
                oReturn.comIndicacao = false;
            }

            aReturn.push(oReturn);
        }

        //console.log("Comissoes SEM Representante", aReturn.length)


        return aReturn;
    });

    service.on("representacoesPorCargo", async req => {

        let aReturn = [];

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante),
            aReguladores = await cds.read(Reguladores),
            aRepresentantes = await cds.read(Usuarios),
            aCalssifCargo = await cds.read(CargoClassificacoes);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        console.log("Comissoes com Representante", aComissoesComRep.length)

        for (let i = 0; i < aComissoes.length; i++) {
            const element = aComissoes[i];
            var oReturn = {};

            oReturn.ID = element.ID;
            oReturn.comissao = element.descricao;

            if (element.regulador_ID) {
                const oRegulador = aReguladores.find(r => r.ID === element.regulador_ID);
                oReturn.regulador = oRegulador.descricao;
            } else {
                oReturn.regulador = "OUTROS";
            }

            const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

            if (find) {
                const oRepresentante = aRepresentantes.find(rep => rep.ID === find.usuario_ID);
                const oClassCargo = aCalssifCargo.find(carg => carg.ID === oRepresentante.cargoClassif_ID);

                oReturn.cargo = oClassCargo ? oClassCargo.descricao : oRepresentante.cargo;
                aReturn.push(oReturn);

            }

        }

        return aReturn;

    });

    service.on("deleteSelectedUsers", async req => {


        console.log(req.data.ids.split(";"));
        let aUsersDelete = req.data.ids.split(";");
        for (let i = 0; i < aUsersDelete.length; i++) {
            const userDel = aUsersDelete[i];
            if (userDel.length > 4) {
                console.log(userDel);

                try {
                    const delComissoesUsuario = await service.delete(ComissoesRepresentante).where({ usuario_ID: userDel })
                    console.log("Comissoes usuario deletadas", delComissoesUsuario);
                } catch (error) {
                    console.log("Erro ao Excluir Comissoes", error);
                }

                try {
                    const delUsuario = await service.delete(Usuarios).where({ ID: userDel });
                    console.log("Usuario deletado", delUsuario);
                } catch (error) {
                    console.log("Erro ao Excluir Usuario", error);
                }


            }

        }

    });


    service.on("deleteSelectedReguladores", async req => {


        console.log(req.data.ids.split(";"));
        let aReguDelete = req.data.ids.split(";");
        for (let i = 0; i < aReguDelete.length; i++) {
            const reguDel = aReguDelete[i];
            if (reguDel !== "") {

                try {
                    console.log(reguDel);
                    const deRegulador = await service.delete(Reguladores).where({ ID: reguDel })
                    console.log("Regulador deletado", deRegulador);
                } catch (error) {
                    console.log("Errro ao excluir Regulaodr", error);
                    req.reject(400, error);
                }



            }

        }

    });


    service.on("deleteSelectedComissoes", async req => {


        console.log(req.data.ids.split(";"));
        let aComissoesDelete = req.data.ids.split(";");
        for (let i = 0; i < aComissoesDelete.length; i++) {
            const comissaoDel = aComissoesDelete[i];
            if (comissaoDel !== "") {

                try {
                    console.log(comissaoDel);
                    const delComissao = await service.delete(Comissoes).where({ ID: comissaoDel })
                    console.log("Comissao deletada", delComissao);
                } catch (error) {
                    console.log("Errro ao excluir Comissao", error);
                    req.reject(400, error);
                }


            }

        }

    });

    service.on("deleteSelectedTiposAlerta", async req => {


        console.log(req.data.ids.split(";"));
        let aTpAlertaDelete = req.data.ids.split(";");
        for (let i = 0; i < aTpAlertaDelete.length; i++) {
            const tpAlertDel = aTpAlertaDelete[i];
            if (tpAlertDel !== "") {

                try {
                    console.log(tpAlertDel);
                    const deTipoAlerta = await service.delete(TiposAlerta).where({ ID: tpAlertDel })
                    console.log("Tipo de Alerta deletado", deTipoAlerta);
                } catch (error) {
                    console.log("Errro ao excluir tipo de Alerta", error);
                    req.reject(500, error);
                }



            }

        }

    });


});



