'use strict';
const assert = require('assert');
let Assignment, Project, Ticket, User, db;

const Projects = [
  {name: 'Project 1'},
  {name: 'Project 2'},
  {name: 'Project 3'},
];

const Tickets = [
  {subject: 'Ticket 1', projectId: 2},
  {subject: 'Ticket 2', projectId: 1},
  {subject: 'Ticket 3', projectId: 3},
  {subject: 'Ticket 4', projectId: 2},
  {subject: 'Ticket 5', projectId: 2},
  {subject: 'Ticket 6', projectId: 2},
  {subject: 'Ticket 7', projectId: 1},
];

const Users = [
  {email: 'guybrush.threepwood@melee-island.com'},
  {email: 'elaine.marley@melee-island.com'},
  {email: 'herman.toothrot@monkey-island.com'},
  {email: 'g.p.le-chuck@melee-island.com'},
];

const Assignments = [
  {ticketId: 1, userId: 1},
  {ticketId: 1, userId: 2},
  {ticketId: 2, userId: 3},
  {ticketId: 3, userId: 1},
  {ticketId: 3, userId: 4},
];

describe('relations support', function() {
  before(async () => {
    db = global.getDataSource();

    Project = db.define('Project', {name: String});
    Ticket = db.define('Ticket', {subject: String});
    Assignment = db.define('Assignment');
    User = db.define('User', {email: String});

    Project.hasMany('Ticket', {as: 'tickets'});
    Ticket.belongsTo('Project', {as: 'project'});
    Ticket.hasMany('User', {as: 'resolvers', through: Assignment});
    Assignment.belongsTo('Ticket', {as: 'ticket'});
    Assignment.belongsTo('User', {as: 'user'});

    await db.automigrate(['Assignment', 'Project', 'Ticket', 'User']);

    for (const project of Projects) {
      await Project.create(project);
    }

    for (const ticket of Tickets) {
      await Ticket.create(ticket);
    }

    for (const user of Users) {
      await User.create(user);
    }

    for (const assignment of Assignments) {
      await Assignment.create(assignment);
    }
  });

  it('smoke test', async () => {
    const projects = await Project.find();
    const tickets = await Ticket.find();
    const project2Tickets = await projects[1].tickets.find();
    const ticket7Project = await tickets[6].project.get();
    assert.equal(projects.length, 3, 'Got 3 projects in the DB');
    assert.equal(tickets.length, 7, 'Got 7 tickets in the DB');
    assert.equal(project2Tickets.length, 4, 'Project 2 has 4 tickets');
    assert.equal(ticket7Project.name, 'Project 1', 'Ticket 7 has a project with name Project 1');
  });

  it('belongsTo basic test', async () => {
    const tickets = await Ticket.find({where: {'project.name': {ilike: 'pr%3'}}});
    assert.equal(tickets.length, 1, 'One ticket found');
    assert.equal(tickets[0].subject, 'Ticket 3');
  });

  it('belongsTo order test', async () => {
    const tickets = await Ticket.find({order: 'project.name DESC'});
    const firstTicketProject = await tickets[0].project.get();
    assert.equal(firstTicketProject.name, 'Project 3');
  });

  it('find in hasMany relation', async () => {
    const projects = await Project.find({
      where: {'tickets.subject': {ilike: 'tick% 4'}},
    });

    assert.equal(projects.length, 1, 'Found 1 project');
    assert.equal(projects[0].name, 'Project 2', 'correct projct name');
  });

  it('hasManyThrough test', async () => {
    const tickets = await Ticket.find({
      where: {'resolvers.email': {ilike: '%mele%'}},
      order: 'subject DESC',
    });

    assert.equal(tickets.length, 2, 'found two tickets');
    assert.equal(tickets[0].subject, 'Ticket 3', 'order is correct');
  });
});
