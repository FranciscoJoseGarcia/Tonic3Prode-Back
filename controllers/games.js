const { Games, Users, Tournaments, Teams } = require("../db_models");
const gamesData = require("../seed/games");
const { validationUser } = require("../utils/environments");
const { createLog } = require("../utils/createLog");

module.exports = {
  getAll: async (req, res, next) => {
    const { uid } = req.params;
    try {
      const games = await Games.find({}).populate("tournaments");
      // registro en caso de exito en log
      await createLog(
        uid,
        "GET",
        req.originalUrl,
        games,
        "Se solicitan todos los partidos de la base de datos"
      );
      res.send(games);
    } catch (err) {
      await createLog(uid, "GET", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },

  getGamesByTournamentId: async (req, res, next) => {
    const { _id, uid } = req.params;
    try {
      const games = await Games.find({ tournaments: _id }).populate(
        "tournaments",
        "title"
      );
      // registro en caso de exito en log
      await createLog(
        uid,
        "GET",
        req.originalUrl,
        games,
        "Solicitando todos los partidos de un torneo especifico"
      );
      res.send(games);
    } catch (err) {
      await createLog(uid, "GET", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },

  bulkCreateAGames: async (req, res, next) => {
    const tournamentId = req.params.id;
    const { matches, uid } = req.body;
    const user = await Users.findOne({ uid });
    validationUser(user, res);
    try {
      if (!Array.isArray(matches) || matches.length === 0) {
        return res.status(400).send({ error: "Invalid or missing games data" });
      }

      const games = [];

      for (let i = 0; i < matches.length; i++) {
        const stage = matches[i].stage;
        const homeTeam = matches[i].homeTeam;
        const awayTeam = matches[i].awayTeam;
        const hour = matches[i].time;
        const hourMinutes = hour.split(":").join("");

        const gameIndex = i + 1;
        const dateObj = new Date(matches[i].date);
        const dayOfTheWeek = dateObj.getDay();
        const dayOfTheMonth = dateObj.getDate();
        const month = dateObj.getMonth() + 1;

        const newGame = new Games({
          tournaments: tournamentId,
          gameIndex: gameIndex,
          stage: stage,
          status: "pending",
          details: "details of the match",
          teams: [homeTeam, awayTeam],
          dayOfTheWeek: dayOfTheWeek,
          dayOfTheMonth: dayOfTheMonth,
          month: month,
          hour: hourMinutes,
        });
        games.push(newGame);
        await newGame.save();
      }
      // push games: Actualizar el torneo con los nuevos juegos
      const updatedTournament = await Tournaments.findOneAndUpdate(
        { _id: tournamentId },
        { $push: { games: { $each: games } } },
        { new: true }
      );

      // registro en caso de exito en log
      await createLog(
        uid,
        "POST",
        req.originalUrl,
        games,
        "Creando todos los partidos de un torneo especifico"
      );
      res.send("Los encuentros se han creado correctamente");
    } catch (err) {
      await createLog(uid, "POST", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },
  addManyResults: async (req, res, next) => {
    const { id } = req.params;
    const results = req.body.myData;
    const uid = req.body.uid;
    console.log(results);
    const user = await Users.findOne({ uid });
    validationUser(user, res);
    try {
      const gamesUpdated = [];

      for (let i = 0; i < results.length; i++) {
 
        const gameToUpdate = results[i];
        const gameId = gameToUpdate._id;
        const stage = results.length
        const homeTeam = gameToUpdate.teams[0].name;
        const awayTeam = gameToUpdate.teams[1].name;
        const homeTeamScore = gameToUpdate.result.homeTeamScore;
        const homeTeamPenalties = gameToUpdate.result.homeTeamPenalties;
        const awayTeamScore = gameToUpdate.result.awayTeamScore;
        const awayTeamPenalties = gameToUpdate.result.awayTeamPenalties;
        const winningType = gameToUpdate.result.winningType;
        let winningTeam = "";
        

        if (winningType === "regular") {
          if (homeTeamScore > awayTeamScore) {
            winningTeam = homeTeam;
          } else {
            winningTeam = awayTeam;
          }
          console.log("Winning team (regular):", winningTeam);
        } else if (winningType === "penalties") {
          if (
            homeTeamScore + homeTeamPenalties >
            awayTeamScore + awayTeamPenalties
          ) {
            winningTeam = homeTeam;
          } else {
            winningTeam = awayTeam;
          }
          console.log("Winning team (penalties):", winningTeam);
        }

        const newstatus = gameToUpdate.result.homeTeamScore
          ? "closed"
          : "pending";

        const updatedGame = await Games.findOneAndUpdate(
          { _id: gameId },
          {
            stage: stage,
            status: newstatus,
            result: {
              homeTeam: homeTeam ? homeTeam : "",
              awayTeam: awayTeam ? awayTeam : "",
              homeTeamScore: homeTeamScore ? homeTeamScore : "",
              awayTeamScore: awayTeamScore ? awayTeamScore : "",
              homeTeamPenalties: homeTeamPenalties ? homeTeamPenalties : "",
              awayTeamPenalties: awayTeamPenalties ? awayTeamPenalties : "",
              winningTeam: winningTeam ? winningTeam : "",
              winningType: winningType ? winningType : "",
            },
          },
          { new: true }
        );
        gamesUpdated.push(updatedGame);
      }
      // registro en caso de exito en log
      await createLog(
        uid,
        "PUT",
        req.originalUrl,
        gamesUpdated,
        "Se modifican varios resultados de partidos de un torneo a la vez"
      );

      // Verificar si se han registrado resultados para todos los juegos de la fase anterior
      // necesito buscar todos los games de un torneo y filtrar por stage y verificar si el array de resultados tiene resultado
      const games = await Games.find({ tournaments: id });

      // si la cantidad de resultados es igual a la cantidad de juegos de la fase anterior, entonces se cambia allResultsRegistered a true
      let allResultsRegistered = false;
      let count = 0;
      games.forEach(function (game) {
        console.log(results.length, "largo de resultados")
        console.log(game.stage, "stage del juego")
        console.log(game.status, "status del juego")
        console.log(parseInt(game.stage) === results.length, "stage del juego es igual al largo de resultados");
        if (game.status === "closed" && parseInt(game.stage) === results.length) {
            console.log("count:", count);
          count++;
          if (count === games.length) {
            console.log("count:", count);
            console.log("PASE ACA")
            allResultsRegistered = true;
          }
        } 
      });

      console.log("allResultsRegistered:", allResultsRegistered);
      // si allResultsRegistered es true, entonces se mappean los resultados para obtener los ganadores y se crea una nueva fase
      if (allResultsRegistered) {
        // Crear un array para almacenar los objetos de los equipos ganadores
        const winningTeams = [];
        // Buscar los objetos de los equipos ganadores y agregarlos al array
        for (const game of games) {
          console.log("decime que es esto:",game.result.winningTeam);
          const winners = await Teams.find({ name: game.result.winningTeam });
          console.log("Winners:", winners)
          winningTeams.push(winners);
        }
        if( winningTeams.length === 1) {
        return res.send("El torneo ha finalizado")
        }
        let gameIndex = 1;
        // Crear los juegos de la nueva fase
        for (let i = 0; i < winningTeams.length; i += 2) {      
          const team1 = winningTeams[i];
          const team2 = winningTeams[i + 1];
          console.log("team1:", team1)
          console.log("team2:", team2)

         const newStage =
           winningTeams.length === 16
             ? "8"
             : winningTeams.length === 8
             ? "4"
             : winningTeams.length === 4
             ? "2"
             : winningTeams.length === 2
             ? "final"
             : ""

          const newGame = new Games({
            tournaments: id,
            gameIndex: gameIndex++,
            stage: newStage,
            status: "pending",
            details: "details of the match",
            teams: [team1, team2],
            dayOfTheWeek: 0,
            dayOfTheMonth: 0,
            month: 0,
            hour: 0,
          });
          console.log("Juegos creados", newGame);

          games.push(newGame);
          await newGame.save();
        }
      }
      res.send("Los resultados se han agregado correctamente");
    } catch (err) {
      await createLog(uid, "PUT", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },

  adminEditAGame: async (req, res) => {
    const { uid } = req.body;
    const { id } = req.params;
    const user = await Users.findOne({ uid });
    validationUser(user, res);
    try {
      const game = await Games.findOneAndUpdate({ _id: id }, req.body);
      // registro en caso de exito en log
      await createLog(
        uid,
        "PUT",
        req.originalUrl,
        game,
        "Se modifican varios resultados de partido de un torneo a la vez"
      );
      res.send(game);
    } catch (err) {
      await createLog(uid, "PUT", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },

  adminDeleteAGame: async (req, res) => {
    const { uid } = req.body;
    const { id } = req.params;
    const user = await Users.findOne({ uid });
    validationUser(user, res);
    try {
      const game = await Games.deleteOne({ _id: id });
      // registro en caso de exito en log
      await createLog(
        uid,
        "DELETE",
        req.originalUrl,
        game,
        "Se borro un juego de la base de datos"
      );
      res.send(game);
    } catch (err) {
      await createLog(uid, "DELETE", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },

  deleteGames: async (req, res, next) => {
    const { uid } = req.body;
    const user = await Users.findOne({ uid });
    validationUser(user, res);
    try {
      const games = await Games.deleteMany();
      // registro en caso de exito en log
      await createLog(
        uid,
        "DELETE",
        req.originalUrl,
        games,
        "Se borraron todos los juegos de la base de datos"
      );
      res.send("All games were deleted");
    } catch (err) {
      await createLog(uid, "DELETE", req.originalUrl, err); // registro en caso de error
      next(err);
    }
  },
};
