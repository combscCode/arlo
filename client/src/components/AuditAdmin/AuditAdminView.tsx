import React, { useRef } from 'react'
import { useParams, Redirect, useHistory } from 'react-router-dom'
import { Spinner, H3, Intent } from '@blueprintjs/core'
import { useQueryClient } from 'react-query'
import {
  useRounds,
  isDrawSampleComplete,
  drawSampleError,
  isDrawingSample,
  useStartNextRound,
  useUndoRoundStart,
  ISampleSizes,
  roundsQueryKey,
  IRound,
} from './useRoundsAuditAdmin'
import { useJurisdictions, jurisdictionsQueryKey } from '../useJurisdictions'
import { useContests } from '../useContests'
import { useAuditSettings } from '../useAuditSettings'
import { Wrapper, Inner } from '../Atoms/Wrapper'
import { AuditAdminStatusBox } from '../Atoms/StatusBox'
import { RefreshTag } from '../Atoms/RefreshTag'
import Setup from './Setup/Setup'
import Progress from './Progress/Progress'

interface IParams {
  electionId: string
  view: 'setup' | 'progress' | ''
}

const AuditAdminView: React.FC = () => {
  const { electionId, view } = useParams<IParams>()

  const queryClient = useQueryClient()
  const history = useHistory()
  const lastFetchedRounds = useRef<IRound[] | null>(null)
  const roundsQuery = useRounds(electionId, {
    refetchInterval: rounds =>
      rounds && isDrawingSample(rounds) ? 1000 : false,
    onSuccess: rounds => {
      // If we ever see the round status change from drawing to complete,
      // redirect to the progress view and reload jurisdiction progress.
      // This is a bit of a hacky way to do it, but there's not really a better
      // way supported with react-query.
      if (
        lastFetchedRounds.current &&
        !isDrawSampleComplete(lastFetchedRounds.current) &&
        isDrawSampleComplete(rounds)
      ) {
        queryClient.invalidateQueries(jurisdictionsQueryKey(electionId))
        history.push(`/election/${electionId}/progress`)
      }
      lastFetchedRounds.current = rounds
    },
  })
  const startNextRoundMutation = useStartNextRound(electionId)
  const undoRoundStartMutation = useUndoRoundStart(electionId)

  const jurisdictionsQuery = useJurisdictions(electionId)
  const contestsQuery = useContests(electionId)
  const auditSettingsQuery = useAuditSettings(electionId)

  if (
    !jurisdictionsQuery.isSuccess ||
    !contestsQuery.isSuccess ||
    !roundsQuery.isSuccess ||
    !auditSettingsQuery.isSuccess
  )
    return null // Still loading

  const jurisdictions = jurisdictionsQuery.data
  const contests = contestsQuery.data
  const rounds = roundsQuery.data
  const auditSettings = auditSettingsQuery.data

  if (isDrawingSample(rounds)) {
    return (
      <Wrapper>
        <Inner>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              marginTop: '100px',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <Spinner size={Spinner.SIZE_LARGE} intent={Intent.PRIMARY} />
            </div>
            <H3>Drawing a random sample of ballots...</H3>
            <p>For large elections, this can take a couple of minutes.</p>
          </div>
        </Inner>
      </Wrapper>
    )
  }

  const startNextRound = async (sampleSizes: ISampleSizes) => {
    const nextRoundNum =
      rounds.length === 0 ? 1 : rounds[rounds.length - 1].roundNum + 1
    await startNextRoundMutation.mutateAsync({
      sampleSizes,
      roundNum: nextRoundNum,
    })
    return true
  }

  const undoRoundStart = async () => {
    const currentRoundId = rounds[rounds.length - 1].id
    await undoRoundStartMutation.mutateAsync(currentRoundId)
    return true
  }

  switch (view) {
    case 'setup':
      return (
        <Wrapper>
          <AuditAdminStatusBox
            rounds={rounds}
            startNextRound={startNextRound}
            undoRoundStart={undoRoundStart}
            jurisdictions={jurisdictions}
            contests={contests}
            auditSettings={auditSettings}
          />
          <Setup
            electionId={electionId}
            auditSettings={auditSettings}
            startNextRound={startNextRound}
            isAuditStarted={rounds.length > 0}
          />
        </Wrapper>
      )
    case 'progress':
      return (
        <Wrapper>
          <AuditAdminStatusBox
            rounds={rounds}
            startNextRound={startNextRound}
            undoRoundStart={undoRoundStart}
            jurisdictions={jurisdictions}
            contests={contests}
            auditSettings={auditSettings}
          >
            <RefreshTag
              refresh={() => {
                queryClient.invalidateQueries(roundsQueryKey(electionId))
                queryClient.invalidateQueries(jurisdictionsQueryKey(electionId))
              }}
            />
          </AuditAdminStatusBox>
          {!drawSampleError(rounds) && (
            <Inner>
              <Progress
                jurisdictions={jurisdictions}
                auditSettings={auditSettings}
                round={rounds.length > 0 ? rounds[rounds.length - 1] : null}
              />
            </Inner>
          )}
        </Wrapper>
      )
    default:
      return (
        <Redirect
          to={
            rounds.length > 0
              ? `/election/${electionId}/progress`
              : `/election/${electionId}/setup`
          }
        />
      )
  }
}

export default AuditAdminView
