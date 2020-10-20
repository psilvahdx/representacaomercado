const { serve } = require('@sap/cds');
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
        AlertasUsuario,
        EventosAlerta } = service.entities;


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

        //console.log("Alertas Usuario Select >>>>>",SELECT);

        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
        }

        if (!SELECT.where) {
            SELECT.where = [{ ref: ['usuario_ID'] },
                '=',
            { val: usuario.ID }];
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
                const where = `perfil_ID ='${usuario.perfil_ID}' or perfil_ID = 'null' `;
                const expr = cds.parse.expr(where);
                SELECT.where = expr.xpr;
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

    service.before("READ", Comissoes, async (req) => {

        let usuario = {},
            aUsers = [],
            acomissoesIds = [],
            aComissoesUsuario = [],
            xprComissoesIds = {};

        const { SELECT } = req.query;

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });

        if (aUsers.length > 0) {
            usuario = aUsers[0];
            console.log("Usuario:", usuario);
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({ usuario_ID: usuario.ID });
        }

        switch (usuario.perfil_ID) {
            case "REP":
            case "VP_DIR":
                //VP/Diretor e Representante somente visualiza as comissões que esta relacionado
                acomissoesIds = aComissoesUsuario.map(x => x.comissao_ID);
                if (acomissoesIds.length > 0) {
                    const inComissoesID = `ID in (${acomissoesIds.join(',')})`;
                    console.log("Comissoes ID", inComissoesID);
                    xprComissoesIds = cds.parse.expr(inComissoesID);
                    if (!SELECT.where) {
                        SELECT.where = xprComissoesIds.xpr;
                    }
                } else {
                    req.reject(400, "Sem Comissões Atribuidas");
                }
                break;
            default:
                break;
        }


    });

    //On Events 
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
                    //Se Diretor Possui Comissões ele pode criar/editar temas para as mesmas
                    if (oUser.perfil_ID === "VP_DIR") {
                        const aComissoesUsuario = await cds.read(ComissoesRepresentante).where({ usuario_ID: oUser.ID });
                        if (aComissoesUsuario.length > 0) {
                            oUserEx.acoes.createTemas = true;
                        } else {
                            oUserEx.acoes.createTemas = false;
                        }
                    }

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
        let matricula = "";
        const re = /\S+@\S+\.\S+/;

        if (re.test(oUserEx.ID)) {
            matricula = oUser.matricula;
        } else {
            matricula = oUserEx.ID;
        }

        if (matricula === "P0646683") {
            //Usuario Porto
            matricula = oUser.matricula;
        }

        const oResponse = await getColaborador(matricula).then(ret_api_hierarquia => {

            if (ret_api_hierarquia && ret_api_hierarquia.Nome_Funcionario) {
                oUserEx.nomeColaborador = ret_api_hierarquia.Nome_Funcionario;
                oUserEx.cargo = ret_api_hierarquia.Nome_Cargo_Funcionario;
                oUserEx.emailFuncionario = ret_api_hierarquia.Email_Funcionario;
                oUserEx.centroDeCustoColab = ret_api_hierarquia.Codigo_CentroCusto_Funcionario;
                oUserEx.departamento = ret_api_hierarquia.Nome_Area_Funcionario;
                oUserEx.gerencia = ret_api_hierarquia.Nome_Gerente;
                oUserEx.centroDeCustoGerencia = "";
                oUserEx.coordenador = ret_api_hierarquia.Nome_Coordenador;
                oUserEx.matriculaCoordenador = ret_api_hierarquia.Cadastro_Coordenador;
                oUserEx.emailCoordenador = "";
                oUserEx.gerente = ret_api_hierarquia.Nome_Gerente;
                oUserEx.diretorExecutivo = ret_api_hierarquia.Nome_Superintendente;
                oUserEx.superintendencia = ret_api_hierarquia.Nome_Superintendente;
                oUserEx.diretorGeral = ret_api_hierarquia.Nome_Vice_Presidente;
                oUserEx.diretor = ret_api_hierarquia.Nome_Vice_Presidente;
            }

            console.log("Usr API hierarquia", oUserEx);

            if (context.data.ID) {
                return oUserEx;
            }
            else {
                aUsersEx.push(oUserEx);
                return aUsersEx;
            }

        });

        return oResponse;
        //################################################################ 

    });

    async function getColaborador(matricula) {

        let sPath = `/xsodata/workflows.xsodata/EmpregadosSet('${matricula}')`,
            oColaborador = {};

        try {
            const response = await destination({
                method: "get",
                url: sPath,
                headers: {
                    "content-type": "application/json"
                }
            });

            console.log("ODATA_COLABORADORES_DESTINATION_RESPONSE", response.data);

            oColaborador = response.data.d;

        } catch (error) {

            console.log("ERRO ODATA_COLABORADORES_DESTINATION", error.message);
        }

        return oColaborador;

    }

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

    service.on("getRepresentacoesPorCargo", async req => {

        let aReturn = [];

        const aTemas = await cds.read(Temas).where({ status_ID: [1,2,3] }),
            aRepresentantes = await cds.read(Usuarios),
            aCalssifCargo = await cds.read(CargoClassificacoes);

        console.log("Temas em Aberto", aTemas.length)

        for (let i = 0; i < aTemas.length; i++) {
            const tema = aTemas[i];
            var oReturn = {},
                oClassCargo = {};

            oReturn.ID = tema.ID;
            oReturn.ultimoRegistro = tema.ultimoRegistro;

            const oRepresentante = aRepresentantes.find(rep => rep.ID === tema.representante_ID);
            if(oRepresentante && oRepresentante.cargoClassif_ID){
                oClassCargo = aCalssifCargo.find(carg => carg.ID === oRepresentante.cargoClassif_ID);
            }else{
                oClassCargo = null;
            }
           
            if(oRepresentante){
                oReturn.cargo = oClassCargo ? oClassCargo.descricao : oRepresentante.cargo;
                aReturn.push(oReturn);
            }          


        }

        return aReturn;

    });

    service.on("deleteSelectedUsers", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {
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
                        console.log("Usuario deletado", userDel);
                    } catch (error) {
                        console.log("Erro ao Excluir Usuario", error);
                    }


                }

            }
        } else {
            req.reject(403, "Não Autorizado");
        }


    });


    service.on("deleteSelectedReguladores", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {

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
        } else {
            req.reject(403, "Não Autorizado");
        }

    });


    service.on("deleteSelectedComissoes", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {


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
        } else {
            req.reject(403, "Não Autorizado");
        }


    });

    service.on("deleteSelectedTiposAlerta", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({ ID: req.user.id });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {

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
        } else {
            req.reject(403, "Não Autorizado");
        }

    });

    service.on("replicaEventoAlerta", async req => {

        let aUsers = [],
            aCalendarioUsers = [],
            aPerfisQueRecebem = [],
            aUsuariosQueRecebem = [],
            aEventosAlerta = [],
            oEventoOrigem = {},
            oUser = {};


        aUsers = await cds.read(Usuarios);//.where({ ID:  req.user.id });
        aCalendarioUsers = await cds.read(AlertasUsuario);
        aEventosAlerta = await cds.read(EventosAlerta).where({ ID: req.data.idEvento });
        //Busca dados Usuário logado
        if (aUsers.length > 0) {
            oUser = aUsers.find(user => user.ID === req.user.id);
        }
        if (aEventosAlerta.length > 0) {
            oEventoOrigem = aEventosAlerta[0];
        }

        console.log("Calendários Recuperados:", aCalendarioUsers.length);

        if (oUser.perfil_ID === "ADM") {

            //Verifica se é uma Criação ou Alteração do Evento
            if (!req.data.bCreate) {
                //Exclui os eventos onde há relação com o Evento Origem
                console.log("Exclui os eventos onde há relação com o Evento Origem", oEventoOrigem.ID);
                const delEvents = await cds.delete(EventosAlerta).where({ eventoOrigem_ID: oEventoOrigem.ID });
                console.log("Eventos excluidos com sucesso", oEventoOrigem.ID);
            }

            if (!oEventoOrigem.alertaPessoal) {

                aPerfisQueRecebem = req.data.perfisQueRecebem.split("|");
                aUsuariosQueRecebem = req.data.usuariosQueRecebem.split("|");

                if (aPerfisQueRecebem.length > 0) {
                    //Replica o Alerta para todos os Usuários dos Perfis informados  
                    for (let i = 0; i < aPerfisQueRecebem.length; i++) {
                        const perfil = aPerfisQueRecebem[i];
                        console.log("Perfis Que irão receber o Alerta", aPerfisQueRecebem);
                        var usersPorPerfil = aUsers.filter(usr => { return usr.perfil_ID === perfil });

                        if (usersPorPerfil.length > 0) {

                            for (let x = 0; x < usersPorPerfil.length; x++) {
                                const usuario = usersPorPerfil[x];
                                //Não criar novamente o evento para o Usuário ADM Logado
                                if (usuario.ID !== oUser.ID) {
                                    const oCalendarioUser = aCalendarioUsers.find(calend => calend.usuario_ID === usuario.ID);

                                    if (oCalendarioUser) {

                                        console.log("Id Calendário:", oCalendarioUser.ID);
                                        const oEventoReplica = {

                                            descricao: oEventoOrigem.descricao,
                                            dtInicio: oEventoOrigem.dtInicio,
                                            dtFim: oEventoOrigem.dtFim,
                                            tipo: "Type06",
                                            conteudo: oEventoOrigem.conteudo,
                                            enviaEmail: oEventoOrigem.enviaEmail,
                                            tentative: false,
                                            concluido: false,
                                            alertaPessoal: true,
                                            tipoAlerta_ID: oEventoOrigem.tipoAlerta_ID,
                                            eventoOrigem_ID: oEventoOrigem.ID,
                                            alertaUsuario_ID: oCalendarioUser.ID

                                        };

                                        console.log("Replicando Evento para o calendario do Usuario", usuario.ID);
                                        const aRowsP = await service.create(EventosAlerta).entries(oEventoReplica);
                                        console.log("Evento replicado com sucesso para Usuario", usuario.ID);

                                    }
                                }

                            }


                        }

                    }

                }

                if (aUsuariosQueRecebem.length > 0) {
                    //Replica o Alerta para todos os Usuários informados
                    console.log("Usuarios Que irão receber o Alerta", aUsuariosQueRecebem)
                    for (let z = 0; z < aUsuariosQueRecebem.length; z++) {
                        const usuario_ID = aUsuariosQueRecebem[z];

                        //Não criar novamente o evento para o Usuário ADM Logado
                        if (usuario_ID !== oUser.ID) {

                            const oCalendarioUser = aCalendarioUsers.find(calend => calend.usuario_ID === usuario_ID);

                            if (oCalendarioUser) {
                                console.log("Id Calendário:", oCalendarioUser.ID);
                                const oEventoReplica = {

                                    descricao: oEventoOrigem.descricao,
                                    dtInicio: oEventoOrigem.dtInicio,
                                    dtFim: oEventoOrigem.dtFim,
                                    tipo: "Type06",
                                    conteudo: oEventoOrigem.conteudo,
                                    enviaEmail: oEventoOrigem.enviaEmail,
                                    tentative: false,
                                    concluido: false,
                                    alertaPessoal: true,
                                    tipoAlerta_ID: oEventoOrigem.tipoAlerta_ID,
                                    eventoOrigem_ID: oEventoOrigem.ID,
                                    alertaUsuario_ID: oCalendarioUser.ID

                                };

                                console.log("Replicando Evento para o calendario do Usuario", usuario_ID);
                                const aRowsP = await service.create(EventosAlerta).entries(oEventoReplica);
                                console.log("Evento replicado com sucesso para Usuario", usuario_ID);
                            }
                        }

                    }

                }

            }
        }

    });


});



