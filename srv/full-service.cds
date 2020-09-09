using {representacaomercado.db as db} from '../db/schema';


@path     : '/services/compliance'
@impl     : './dataAccess.js'
@requires : 'authenticated-user'
service FullSerice {

    entity Comissoes              as projection on db.Comissoes;
    entity Status                 as projection on db.Status;
    entity Reguladores            as projection on db.Reguladores;
    entity Criticidades           as projection on db.Criticidades;
    entity Perfis                 as projection on db.Perfis;
    entity PerfilAcoes            as projection on db.PerfilAcoes;
    entity Usuarios               as projection on db.Usuarios;
    entity Temas                  as projection on db.Temas;
    entity Historico              as projection on db.Historico;
    entity ComissoesRepresentante as projection on db.ComissoesRepresentante;
    entity AppSettings            as projection on db.AppSettings;

    entity UsersExtensions {
        key ID                    : String;
            nomeColaborador       : String;
            cargo                 : String;
            telefone              : String;
            emailFuncionario      : String;
            centroDeCustoColab    : String;
            departamento          : String;
            gerencia              : String;
            centroDeCustoGerencia : String;
            coordenador           : String;
            matriculaCoordenador  : String;
            emailCoordenador      : String;
            gerente               : String;
            superintendencia      : String;
            diretor               : String;
            diretorGeral          : String;
            diretorExecutivo      : String;
            userProfile           : Association to Perfis;
            acoes                 : Association to PerfilAcoes;
    }

    function getUserData(id : String) returns String;

}
