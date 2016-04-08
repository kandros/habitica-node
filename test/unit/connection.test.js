import nock from 'nock'
import Connection from '../../src/lib/connection'
import { API_ERRORS } from '../../src/lib/errors'

describe('Connection', () => {
  let habiticaUrl
  const defaultOptions = {
    uuid: 'myUuid',
    token: 'myToken'
  }

  describe('initialization', () => {
    it('defaults to habitica endpoint', () => {
      let connection = new Connection(defaultOptions)
      expect(connection._endpoint).to.eql('https://habitica.com/api/v2')
    })

    it('accepts an override for endpoint', () => {
      let connection = new Connection({
        uuid: 'myUuid',
        token: 'myToken',
        endpoint: 'https://someotherendpoint'
      })

      expect(connection._endpoint).to.eql('https://someotherendpoint')
    })
  })

  context('connection error handling', () => {
    let connection

    before(() => nock.disableNetConnect())

    after(() => nock.enableNetConnect())

    beforeEach(() => {
      connection = new Connection(defaultOptions)
    })

    it('rejects with connection error if habit is unreachable (this is broken with got)', async function () {
      let request = connection.get('user')

      let unknownError = new API_ERRORS.UNKNOWN()

      await expect(request).to.eventually.be.rejected.and.have.property('message', unknownError.message)
    })
  })

  describe('#getUuid', () => {
    it('returns uuid', () => {
      let connection = new Connection(defaultOptions)
      expect(connection.getUuid()).to.eql('myUuid')
    })
  })

  describe('#getToken', () => {
    it('returns token', () => {
      let connection = new Connection(defaultOptions)
      expect(connection.getToken()).to.eql('myToken')
    })
  })

  describe('#getEndpoint', () => {
    it('returns endpoint', () => {
      let connection = new Connection(defaultOptions)
      expect(connection.getEndpoint()).to.eql('https://habitica.com/api/v2')
    })
  })

  describe('#setCredentials', () => {
    let connection

    beforeEach(() => {
      connection = new Connection(defaultOptions)
    })

    it('sets uuid after iniitalization', () => {
      expect(connection._uuid).to.eql('myUuid')

      connection.setCredentials({uuid: 'newUuid'})
      expect(connection._uuid).to.eql('newUuid')
    })

    it('leaves old uuid if not passed in after initalization', () => {
      expect(connection._uuid).to.eql('myUuid')

      connection.setCredentials({token: 'foo'})
      expect(connection._uuid).to.eql('myUuid')
    })

    it('leaves old token if not passed in after initalization', () => {
      expect(connection._token).to.eql('myToken')

      connection.setCredentials({uuid: 'foo'})
      expect(connection._token).to.eql('myToken')
    })

    it('sets token after iniitalization', () => {
      expect(connection._token).to.eql('myToken')

      connection.setCredentials({token: 'newToken'})
      expect(connection._token).to.eql('newToken')
    })

    it('leaves old endpoint if not passed in after initalization', () => {
      expect(connection._endpoint).to.eql('https://habitica.com/api/v2')

      connection.setCredentials({uuid: 'foo'})
      expect(connection._endpoint).to.eql('https://habitica.com/api/v2')
    })

    it('sets endpoint after iniitalization', () => {
      expect(connection._endpoint).to.eql('https://habitica.com/api/v2')

      connection.setCredentials({endpoint: 'http://localhost:3321/api/v2'})
      expect(connection._endpoint).to.eql('http://localhost:3321/api/v2')
    })
  })

  describe('#get', () => {
    let connection

    beforeEach(() => {
      connection = new Connection(defaultOptions)
      habiticaUrl = nock('https://habitica.com/api/v2').get('/user')
    })

    it('returns a promise', () => {
      let request = connection.get('user')

      expect(request).to.be.a('promise')
    })

    it('takes in an optional query parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .get('/group')
        .query({type: 'party'})
        .reply(200)

      await connection.get('group', {query: {type: 'party'}})

      expectedRequest.done()
    })

    it('ignores send parameter if passed in', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .get('/group')
        .reply(200)

      await connection.get('group', {send: {type: 'party'}})

      expectedRequest.done()
    })

    context('succesful request', () => {
      it('returns requested data', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [200, { some: 'data' }]
        })

        let connection = new Connection(defaultOptions)
        let response = await connection.get('user')

        expect(response).to.eql({ some: 'data' })
        expectedRequest.done()
      })
    })

    context('unsuccesful request', () => {
      it('rejects with NotAuthenticated error if credentials are not valid', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [401, {response: {status: 401, text: 'Not Authorized'}}]
        })

        let connection = new Connection(defaultOptions)
        let request = connection.get('user')

        await expect(request).to.eventually.be.rejected
          .and.be.an.instanceOf(API_ERRORS['401'])

        expectedRequest.done()
      })

      it('rejects with NotFound Error if request 404s', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [404, {response: {status: 404, text: 'Not Authorized'}}]
        })

        let connection = new Connection(defaultOptions)
        let request = connection.get('user')

        await expect(request).to.eventually.be.rejected
          .and.be.an.instanceOf(API_ERRORS['404'])

        expectedRequest.done()
      })
    })
  })

  describe('#post', () => {
    beforeEach(() => {
      habiticaUrl = nock('https://habitica.com/api/v2')
        .post('/user/tasks')
    })

    it('returns a promise', () => {
      habiticaUrl.reply(() => {
        return [200, { some: 'data' }]
      })
      let connection = new Connection(defaultOptions)
      let request = connection.post('user/tasks')

      expect(request).to.be.a('promise')
    })

    it('takes in an optional query parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .post('/user/tasks')
        .query({
          type: 'habit',
          text: 'test habit'
        })
        .reply(201, {})

      let connection = new Connection(defaultOptions)
      await connection.post('user/tasks', {
        query: {
          type: 'habit',
          text: 'test habit'
        }
      })

      expectedRequest.done()
    })

    it('takes in an optional send parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .post('/group', {
          type: 'party'
        })
        .reply(200)

      let connection = new Connection(defaultOptions)
      await connection.post('group', {send: {type: 'party'}})

      expectedRequest.done()
    })

    context('succesful request', () => {
      it('returns requested data', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [200, { some: 'data' }]
        })

        let connection = new Connection(defaultOptions)
        let response = await connection.post('user/tasks')

        expect(response).to.eql({ some: 'data' })
        expectedRequest.done()
      })
    })

    context('unsuccesful request', () => {
      it('rejects if credentials are not valid', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [401, {response: {status: 401, text: 'Not Authorized'}}]
        })

        let connection = new Connection(defaultOptions)
        await expect(connection.post('user/tasks')).to.eventually.be.rejected

        expectedRequest.done()
      })
    })
  })

  describe('#put', () => {
    beforeEach(() => {
      habiticaUrl = nock('https://habitica.com/api/v2')
        .put('/user/tasks')
    })

    it('returns a promise', () => {
      habiticaUrl.reply(() => {
        return [200, { some: 'data' }]
      })
      let connection = new Connection(defaultOptions)
      let request = connection.put('user/tasks')

      expect(request).to.be.a('promise')
    })

    it('takes in an optional query parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .put('/user/tasks')
        .query({
          type: 'habit',
          text: 'test habit'
        })
        .reply(201, {})

      let connection = new Connection(defaultOptions)
      await connection.put('user/tasks', {
        query: {
          type: 'habit',
          text: 'test habit'
        }
      })

      expectedRequest.done()
    })

    it('takes in an optional send parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .put('/group', {
          type: 'party'
        })
        .reply(200)

      let connection = new Connection(defaultOptions)
      await connection.put('group', {send: {type: 'party'}})

      expectedRequest.done()
    })

    context('succesful request', () => {
      it('returns requested data', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [200, { some: 'data' }]
        })

        let connection = new Connection(defaultOptions)
        let response = await connection.put('user/tasks')

        expect(response).to.eql({ some: 'data' })
        expectedRequest.done()
      })
    })

    context('unsuccesful request', () => {
      it('rejects if credentials are not valid', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [401, {response: {status: 401, text: 'Not Authorized'}}]
        })

        let connection = new Connection(defaultOptions)
        await expect(connection.put('user/tasks')).to.eventually.be.rejected

        expectedRequest.done()
      })
    })
  })

  describe('#del', () => {
    beforeEach(() => {
      habiticaUrl = nock('https://habitica.com/api/v2')
        .delete('/user/tasks')
    })

    it('returns a promise', () => {
      habiticaUrl.reply(() => {
        return [200, { some: 'data' }]
      })
      let connection = new Connection(defaultOptions)
      let request = connection.del('user/tasks')

      expect(request).to.be.a('promise')
    })

    it('takes in an optional query parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .delete('/user/tasks')
        .query({
          type: 'habit',
          text: 'test habit'
        })
        .reply(201, {})

      let connection = new Connection(defaultOptions)
      await connection.del('user/tasks', {
        query: {
          type: 'habit',
          text: 'test habit'
        }
      })

      expectedRequest.done()
    })

    it('takes in an optional send parameter', async function () {
      let expectedRequest = nock('https://habitica.com/api/v2')
        .delete('/group', {
          type: 'party'
        })
        .reply(200)

      let connection = new Connection(defaultOptions)
      await connection.del('group', {send: {type: 'party'}})

      expectedRequest.done()
    })

    context('succesful request', () => {
      it('returns requested data', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [200, { some: 'data' }]
        })

        let connection = new Connection(defaultOptions)
        let response = await connection.del('user/tasks')

        expect(response).to.eql({ some: 'data' })
        expectedRequest.done()
      })
    })

    context('unsuccesful request', () => {
      it('rejects if credentials are not valid', async function () {
        let expectedRequest = habiticaUrl.reply(() => {
          return [401, {response: {status: 401, text: 'Not Authorized'}}]
        })

        let connection = new Connection(defaultOptions)
        await expect(connection.del('user/tasks')).to.eventually.be.rejected

        expectedRequest.done()
      })
    })
  })
})
