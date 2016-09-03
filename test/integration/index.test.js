import Habitica from '../../src/'
import { updateDocument, generateUser } from '../support/integration_helper'
import {v4 as generateRandomUserName} from 'uuid'

describe('Habitica', function () {
  beforeEach(async function () {
    this.api = new Habitica({
      endpoint: `localhost:${process.env.PORT}/`
    })
    await generateUser(null, this.api)
  })

  describe('#register', function () {
    beforeEach(function () {
      this.api.setCredentials({
        uuid: null,
        token: null
      })
      this.username = generateRandomUserName()
      this.password = 'password'
      this.email = this.username + '@example.com'
    })

    context('Successful', function () {
      it('registers for a new account', async function () {
        await this.api.register(this.username, this.email, this.password)
        let { data: user } = await this.api.get('/user')

        expect(user.auth.local.username).to.equal(this.username)
        expect(user.auth.local.email).to.equal(this.email)
      })

      it('returns a response with the new user', async function () {
        let { data: user } = await this.api.register(this.username, this.email, this.password)

        expect(user._id).to.equal(this.api.getUuid())
        expect(user.apiToken).to.equal(this.api.getToken())
        expect(user.auth.local.username).to.equal(this.username)
        expect(user.auth.local.email).to.equal(this.email)
      })

      it('sets uuid and api token to new user', async function () {
        expect(this.api._uuid).to.not.exist
        expect(this.api._token).to.not.exist

        let { data: user } = await this.api.register(this.username, this.email, this.password)
        expect(this.api.getUuid()).to.be.equal(user._id)
        expect(this.api.getToken()).to.be.equal(user.apiToken)
      })
    })

    context('Invalid Input', function () {
      it('resolves with error when username is not provided', async function () {
        await expect(this.api.register('', this.email, this.password)).to.eventually.be.rejected.and.have.property('status', 400)
      })

      it('resolves with error when email is not provided', async function () {
        await expect(this.api.register(this.username, '', this.password)).to.eventually.be.rejected
      })

      it('resolves with error when password is not provided', async function () {
        await expect(this.api.register(this.username, this.email, '')).to.eventually.be.rejected
      })

      it('resolves with error when email is not valid', async function () {
        await expect(this.api.register(this.username, 'not.a.valid.email@example', this.password)).to.eventually.be.rejected
      })
    })
  })

  describe('#localLogin', function () {
    beforeEach(async function () {
      let registerApi = new Habitica({
        endpoint: `localhost:${process.env.PORT}`
      })
      this.api.setCredentials({
        uuid: null,
        token: null
      })

      this.username = generateRandomUserName()
      this.password = 'password'
      this.email = this.username + '@example.com'

      await registerApi.register(this.username, this.email, this.password)
    })

    context('Success', function () {
      it('logs in with username and password', async function () {
        let { data: creds } = await this.api.localLogin(this.username, this.password)

        expect(creds.id).to.exist
        expect(creds.apiToken).to.exist
      })

      it('sets uuid and token after logging in with username', async function () {
        let { data: creds } = await this.api.localLogin(this.username, this.password)

        expect(this.api.getUuid()).to.be.equal(creds.id)
        expect(this.api.getToken()).to.be.equal(creds.apiToken)
      })

      it('logs in with email and password', async function () {
        let { data: creds } = await this.api.localLogin(this.email, this.password)

        expect(creds.id).to.exist
        expect(creds.apiToken).to.exist
      })

      it('sets uuid and token after logging in with email', async function () {
        let { data: creds } = await this.api.localLogin(this.email, this.password)

        expect(this.api.getUuid()).to.be.equal(creds.id)
        expect(this.api.getToken()).to.be.equal(creds.apiToken)
      })
    })

    context('Failures', function () {
      it('resolves with error when account is not provided', async function () {
        await expect(this.api.localLogin(null, this.password)).to.eventually.be.rejected
      })

      it('resolves with error when account is not provided', async function () {
        await expect(this.api.localLogin(this.username, null)).to.eventually.be.rejected
      })

      it('resolves with error when account does not exist', async function () {
        await expect(this.api.localLogin('not-existant', this.password)).to.eventually.be.rejected
      })

      it('resolves with error when password does not match', async function () {
        await expect(this.api.localLogin(this.username, 'password-not-correct')).to.eventually.be.rejected
      })
    })
  })

  describe('#get', function () {
    it('sends a GET request to Habitica', function () {
      return this.api.get('/user').then((res) => {
        let user = res.data

        expect(user._id).to.equal(this.api.getUuid())
      })
    })

    it('can send query parameters', function () {
      return this.api.get('/groups', {
        type: 'tavern'
      }).then((res) => {
        let groups = res.data
        let tavern = groups.find(group => group.id === '00000000-0000-4000-A000-000000000000')

        expect(tavern).to.exist
        expect(tavern.name).to.equal('Tavern')
      })
    })
  })

  describe('#post', function () {
    it('sends a POST request to Habitica', function () {
      return updateDocument('users', this.api.getUuid(), {
        'stats.hp': 20,
        'stats.gp': 100
      }).then(() => {
        return this.api.post('/user/buy-health-potion')
      }).then((res) => {
        let stats = res.data

        expect(stats.hp).to.be.greaterThan(20)
      })
    })

    it('can send a body object', function () {
      return this.api.post('/tasks/user', {
        text: 'Task Name',
        notes: 'Task Notes',
        type: 'todo'
      }).then((res) => {
        let task = res.data

        expect(task.text).to.equal('Task Name')
        expect(task.notes).to.equal('Task Notes')
      })
    })

    it('can send query parameters', function () {
      return updateDocument('users', this.api.getUuid(), {
        'stats.lvl': 20,
        'stats.points': 20
      }).then(() => {
        return this.api.post('/user/allocate', null, {
          stat: 'int'
        })
      }).then((res) => {
        let stats = res.data

        expect(stats.int).to.equal(1)
      })
    })
  })

  describe('#put', function () {
    it('sends a PUT request to Habitica with a body object', function () {
      return this.api.put('/user', {
        'profile.name': 'New Name'
      }).then((res) => {
        let user = res.data

        expect(user.profile.name).to.equal('New Name')
      })
    })

    it('can send query parameters', function () {
      return this.api.put('/user', {
        'profile.name': 'foo'
      }, {
        userV: 1
      }).then((res) => {
        let userV = res.userV

        expect(userV).to.be.greaterThan(1)
      })
    })
  })

  describe('#del', function () {
    it('sends a DEL request to Habitica', function () {
      return this.api.post('/tasks/user', { type: 'habit', text: 'text' }).then((res) => {
        return this.api.del(`/tasks/${res.data.id}`)
      }).then((res) => {
        expect(res.success).to.be.true
      })
    })

    it('can send a body object', function () {
      return this.api.del('/user', {
        password: 'password'
      }).then((res) => {
        expect(res.success).to.be.true
      })
    })

    it('can send query parameters', function () {
      return this.api.post('/tasks/user', { type: 'habit', text: 'text' }).then((res) => {
        return this.api.del(`/tasks/${res.data.id}`, null, {
          userV: 1
        })
      }).then((res) => {
        expect(res.userV).be.greaterThan(2)
      })
    })
  })
})