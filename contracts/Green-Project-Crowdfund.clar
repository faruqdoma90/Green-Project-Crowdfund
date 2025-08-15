(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-invalid-amount (err u102))
(define-constant err-already-exists (err u103))
(define-constant err-funding-ended (err u104))
(define-constant err-funding-active (err u105))
(define-constant err-goal-not-met (err u106))
(define-constant err-already-claimed (err u107))
(define-constant err-no-contribution (err u108))

(define-data-var next-project-id uint u1)

(define-map projects
    { project-id: uint }
    {
        creator: principal,
        title: (string-ascii 100),
        description: (string-ascii 500),
        goal-amount: uint,
        raised-amount: uint,
        end-block: uint,
        is-active: bool,
        is-claimed: bool,
        category: (string-ascii 50),
    }
)

(define-map contributions
    {
        project-id: uint,
        contributor: principal,
    }
    {
        amount: uint,
        block-contributed: uint,
    }
)

(define-map contributor-totals
    {
        project-id: uint,
        contributor: principal,
    }
    { total-contributed: uint }
)

(define-map project-contributors
    { project-id: uint }
    { contributor-count: uint }
)

(define-read-only (get-project (project-id uint))
    (map-get? projects { project-id: project-id })
)

(define-read-only (get-contribution
        (project-id uint)
        (contributor principal)
    )
    (map-get? contributions {
        project-id: project-id,
        contributor: contributor,
    })
)

(define-read-only (get-contributor-total
        (project-id uint)
        (contributor principal)
    )
    (map-get? contributor-totals {
        project-id: project-id,
        contributor: contributor,
    })
)

(define-read-only (get-project-contributors (project-id uint))
    (map-get? project-contributors { project-id: project-id })
)

(define-read-only (get-next-project-id)
    (var-get next-project-id)
)

(define-read-only (is-project-funded (project-id uint))
    (match (get-project project-id)
        project (>= (get raised-amount project) (get goal-amount project))
        false
    )
)

(define-read-only (is-project-active (project-id uint))
    (match (get-project project-id)
        project (and (get is-active project) (< stacks-block-height (get end-block project)))
        false
    )
)

(define-read-only (calculate-funding-percentage (project-id uint))
    (match (get-project project-id)
        project (let (
                (goal (get goal-amount project))
                (raised (get raised-amount project))
            )
            (if (> goal u0)
                (/ (* raised u100) goal)
                u0
            )
        )
        u0
    )
)

(define-public (create-project
        (title (string-ascii 100))
        (description (string-ascii 500))
        (goal-amount uint)
        (duration-blocks uint)
        (category (string-ascii 50))
    )
    (let (
            (project-id (var-get next-project-id))
            (end-block (+ stacks-block-height duration-blocks))
        )
        (asserts! (> goal-amount u0) err-invalid-amount)
        (asserts! (> duration-blocks u0) err-invalid-amount)
        (map-set projects { project-id: project-id } {
            creator: tx-sender,
            title: title,
            description: description,
            goal-amount: goal-amount,
            raised-amount: u0,
            end-block: end-block,
            is-active: true,
            is-claimed: false,
            category: category,
        })
        (map-set project-contributors { project-id: project-id } { contributor-count: u0 })
        (var-set next-project-id (+ project-id u1))
        (ok project-id)
    )
)

(define-public (contribute
        (project-id uint)
        (amount uint)
    )
    (let (
            (project (unwrap! (get-project project-id) err-not-found))
            (existing-contribution (get-contribution project-id tx-sender))
            (existing-total (get-contributor-total project-id tx-sender))
        )
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (is-project-active project-id) err-funding-ended)
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

        (map-set projects { project-id: project-id }
            (merge project { raised-amount: (+ (get raised-amount project) amount) })
        )

        (map-set contributions {
            project-id: project-id,
            contributor: tx-sender,
        } {
            amount: amount,
            block-contributed: stacks-block-height,
        })

        (match existing-total
            total (map-set contributor-totals {
                project-id: project-id,
                contributor: tx-sender,
            } { total-contributed: (+ (get total-contributed total) amount) }
            )
            (begin
                (map-set contributor-totals {
                    project-id: project-id,
                    contributor: tx-sender,
                } { total-contributed: amount }
                )
                (map-set project-contributors { project-id: project-id } { contributor-count: (+
                    (default-to u0
                        (get contributor-count
                            (get-project-contributors project-id)
                        ))
                    u1
                ) }
                )
            )
        )

        (ok amount)
    )
)

(define-public (claim-funds (project-id uint))
    (let ((project (unwrap! (get-project project-id) err-not-found)))
        (asserts! (is-eq tx-sender (get creator project)) err-owner-only)
        (asserts! (not (get is-claimed project)) err-already-claimed)
        (asserts! (>= stacks-block-height (get end-block project))
            err-funding-active
        )
        (asserts! (>= (get raised-amount project) (get goal-amount project))
            err-goal-not-met
        )

        (map-set projects { project-id: project-id }
            (merge project { is-claimed: true })
        )

        (as-contract (stx-transfer? (get raised-amount project) tx-sender
            (get creator project)
        ))
    )
)

(define-public (refund (project-id uint))
    (let (
            (project (unwrap! (get-project project-id) err-not-found))
            (contribution (unwrap! (get-contribution project-id tx-sender) err-no-contribution))
        )
        (asserts! (>= stacks-block-height (get end-block project))
            err-funding-active
        )
        (asserts! (< (get raised-amount project) (get goal-amount project))
            err-goal-not-met
        )

        (map-delete contributions {
            project-id: project-id,
            contributor: tx-sender,
        })

        (as-contract (stx-transfer? (get amount contribution) tx-sender tx-sender))
    )
)

(define-public (cancel-project (project-id uint))
    (let ((project (unwrap! (get-project project-id) err-not-found)))
        (asserts! (is-eq tx-sender (get creator project)) err-owner-only)
        (asserts! (get is-active project) err-funding-ended)

        (map-set projects { project-id: project-id }
            (merge project { is-active: false })
        )

        (ok true)
    )
)

(define-public (extend-funding
        (project-id uint)
        (additional-blocks uint)
    )
    (let ((project (unwrap! (get-project project-id) err-not-found)))
        (asserts! (is-eq tx-sender (get creator project)) err-owner-only)
        (asserts! (get is-active project) err-funding-ended)
        (asserts! (> additional-blocks u0) err-invalid-amount)

        (map-set projects { project-id: project-id }
            (merge project { end-block: (+ (get end-block project) additional-blocks) })
        )

        (ok (+ (get end-block project) additional-blocks))
    )
)

(define-read-only (get-total-projects)
    (var-get next-project-id)
)

(define-read-only (is-creator-project
        (project-id uint)
        (creator principal)
    )
    (match (get-project project-id)
        project (is-eq (get creator project) creator)
        false
    )
)

(define-read-only (get-project-stats (project-id uint))
    (match (get-project project-id)
        project (let (
                (contributors (default-to { contributor-count: u0 }
                    (get-project-contributors project-id)
                ))
                (percentage (calculate-funding-percentage project-id))
            )
            (some {
                project-id: project-id,
                raised: (get raised-amount project),
                goal: (get goal-amount project),
                contributors: (get contributor-count contributors),
                percentage: percentage,
                blocks-remaining: (if (> (get end-block project) stacks-block-height)
                    (- (get end-block project) stacks-block-height)
                    u0
                ),
                is-funded: (is-project-funded project-id),
            })
        )
        none
    )
)
