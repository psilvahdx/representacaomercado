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
    entity CargoClassificacoes    as projection on db.ClassificacaoCargo;
    entity Temas                  as projection on db.Temas;
    entity Historico              as projection on db.Historico;   
    entity ComissoesRepresentante as projection on db.ComissoesRepresentante;
    entity AppSettings            as projection on db.AppSettings;

 
    view TemasPorRegulador() as
        select from db.Temas {
            key substr(
                    primeiroRegistro, 1, 4
                ) || '-' || substr(
                    primeiroRegistro, 6, 2
                ) || '-01T00:00:00Z' as mesAno               : DateTime,
            key regulador.descricao  as descRegulador,
                count(
                    ID
                )                    as qtdTemasPorRegulador : Integer
        }
        group by
            primeiroRegistro,
            regulador.descricao;

    view TemasPorCriticidade() as
        select from db.Temas {
            key substr(
                    primeiroRegistro, 1, 4
                ) || '-' || substr(
                    primeiroRegistro, 6, 2
                ) || '-01T00:00:00Z'  as mesAno                 : DateTime,
            key criticidade.descricao as descCriticidade,
                count(
                    ID
                )                     as qtdTemasPorCriticidade : Integer
        }
        group by
            primeiroRegistro,
            criticidade.descricao;
   
   entity RepresentacoesMercado{
        key ID : Integer;
         comIndicacao: Boolean;
         comissao: String;
         regulador: String;
    };   

    entity RepresentacoesPorCargo{
        key ID : Integer;         
         cargo: String;
         comissao: String;
         regulador: String;
    }; 

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

    action deleteSelectedUsers(ids : String);
    action deleteSelectedReguladores(ids : String);
    action deleteSelectedComissoes(ids : String);
    function comissoesSemRepresentante() returns array of Comissoes;
    function comissoesComRepresentante() returns array of Comissoes;
    function representacoesMercado() returns array of RepresentacoesMercado;
    function representacoesPorCargo() returns array of RepresentacoesPorCargo;
    function getUserExtension(ID: String) returns UsersExtensions;




}
